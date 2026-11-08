/**
 * RH_Daily.gs — khoá mở BẢN TIN NỘI BỘ của app MMH Daily (★ v3.40, 08/11/2026).
 *
 * Bản tin nội bộ Chủ nhật (công việc phòng ban, đi địa bàn, thầu, đào tạo) được GitHub Actions MÃ HOÁ (AES-256-GCM) trước khi đưa lên
 * trang công khai. Chỉ người đăng nhập Report Hub / CRM bằng email công ty (phiên `tk`, RH_Users đang hoạt động) mới lấy được khoá để giải mã.
 *
 *   action dailyKey (tk) ⇒ { ok, key: base64 32 byte, kid: 8 ký tự nhận diện, admin }
 *   Khoá tự tạo lần đầu (Script Property DAILY_KEY), không bao giờ ghi vào code / repo.
 *   Admin: app hiện khoá để dán vào secret DAILY_INTERNAL_KEY của kho MMH Daily (1 lần).
 *   Đổi khoá (lộ khoá): xoá Script Property DAILY_KEY ⇒ lần gọi sau tự tạo khoá mới ⇒ Admin dán lại vào GitHub.
 */
function rhDailyKeyGet_() {
  var props = PropertiesService.getScriptProperties();
  var k = props.getProperty('DAILY_KEY');
  if (!k) {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      k = props.getProperty('DAILY_KEY');
      if (!k) {
        var seed = Utilities.getUuid() + Utilities.getUuid() + Date.now() + Math.random();
        k = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, seed, Utilities.Charset.UTF_8));
        props.setProperty('DAILY_KEY', k);
      }
    } finally { lock.releaseLock(); }
  }
  return k;
}

function rhDailyKid_(k) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'kid|' + k, Utilities.Charset.UTF_8);
  return d.slice(0, 4).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function apiRhDailyKey(p) {
  var r = rhCheck(p.tk);
  if (r.err) return { ok: false, code: 'AUTH', error: r.err + ' Vui lòng đăng nhập bằng email công ty.' };
  var k = rhDailyKeyGet_();
  return { ok: true, key: k, kid: rhDailyKid_(k), admin: !!r.u.admin, pic: r.u.pic || '', run: (typeof drFlags_ === 'function') ? drFlags_() : null };
}
