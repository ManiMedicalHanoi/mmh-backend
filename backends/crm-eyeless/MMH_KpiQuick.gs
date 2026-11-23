/*************************************************************************************************
 * MMH_KpiQuick.gs — 23/11/2026 · GIỐNG HỆT ở crm-dental · crm-surgical · crm-eyeless · crm-thai · crm-thai-dental
 *  (sửa 1 nơi ⇒ chép sang nơi khác)
 *
 *  Người dùng: "lưu mỗi lần rất lâu" (Yong, Dental Thái) + "cải tiến tốc độ cho mọi team".
 *  k68PushQuick_ (đẩy số KPI của tab TARGET & KPI sang file KPI tổng: flush + mở file KPI + đọc / ghi, vài giây tới hơn chục giây)
 *  trước đây giữ ScriptLock suốt lượt đồng bộ ⇒ mọi lệnh LƯU (saveWeekly, saveCustomer…) dùng chung ScriptLock phải đứng chờ,
 *  nhiều lệnh dồn lại ⇒ "The system is busy". Nay lượt đẩy KPI dùng cờ riêng (CacheService, tự hết hạn sau 150 giây):
 *  chỉ chặn 2 lượt đẩy KPI chạy cùng lúc, KHÔNG chặn lệnh lưu. ScriptLock chỉ giữ ~vài mili giây để đặt cờ.
 *  Dùng: trong k68PushQuick_ `var lock = k68QLock_();` (cùng giao diện tryLock / releaseLock như LockService).
 *************************************************************************************************/
var K68Q = { FLAG: 'k68q_run', TTL: 150 };
function k68QLock_(){
  var mine = '';
  return {
    tryLock: function(ms){
      var c = CacheService.getScriptCache(), end = Date.now() + (ms || 0);
      while(true){
        var got = false, L = LockService.getScriptLock();
        if(L.tryLock(3000)){
          try{ if(!c.get(K68Q.FLAG)){ mine = String(Date.now()) + Math.random(); c.put(K68Q.FLAG, mine, K68Q.TTL); got = true; } }
          finally{ L.releaseLock(); }
        }
        if(got) return true;
        if(Date.now() >= end) return false;
        Utilities.sleep(700);
      }
    },
    releaseLock: function(){
      try{ var c = CacheService.getScriptCache(); if(mine && c.get(K68Q.FLAG) === mine) c.remove(K68Q.FLAG); }catch(e){}
    }
  };
}
