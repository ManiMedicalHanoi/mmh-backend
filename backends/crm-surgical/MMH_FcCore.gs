/* ════════════════════════════════════════════════════════════════════════════════════════
   MMH · FOLLOW UP BY ACCOUNT — LÕI TÍNH DỰ BÁO DOANH SỐ (thuần JS, không gọi dịch vụ Google ⇒ chạy được cả Node để kiểm thử)
   Người dùng yêu cầu 09/11/2026, theo 2 file mẫu "MMH × HÙNG VĨ / I-CARE — KẾ HOẠCH FY68":

   Nguồn: gói thầu của NPP (Hùng Vĩ · I-Care: trúng / trượt / đang dự thầu) + KQTT dao toàn quốc (mọi hãng).
   Mỗi BỆNH VIỆN xét theo GÓI THẦU GẦN NHẤT; mỗi MÃ SẢN PHẨM của 1 gói = 1 dòng.
     ① Existing  — gói MANI đã trúng, còn hiệu lực trong FY (chỉ tính phần tháng nằm trong FY). Số chắc chắn.
     ② Duy trì   — gói MANI gần nhất hết hiệu lực TRONG FY (hoặc đúng tháng trước FY) ⇒ gói kế tiếp bắt đầu tháng sau tháng hết hạn,
                   SL mặc định = gói cũ (sales sửa được). Gói MANI đã hết hạn sớm hơn ⇒ để trống tháng bắt đầu (sales điền).
     ③ Mở mới    — loại dao mà HÃNG KHÁC đang giữ ở gói gần nhất ⇒ cơ hội từ tháng sau khi gói đối thủ hết hạn, SL MANI mặc định = 0
                   (sales điền; gói NPP đã dự mà trượt ⇒ mặc định SL đã chào). "SL hãng khác" = SL đối thủ (tham chiếu).
     Đang dự thầu — gói NPP chưa có kết quả ⇒ thay dòng ② / ③ cùng loại dao của bệnh viện đó.
   Doanh số khả thi: chia đều SL gói theo số tháng hiệu lực (SL / tháng) × giá bán MANI → NPP theo mã × số tháng nằm trong FY.
   Tháng tính bằng chỉ số y*12 + (m-1) (T09/2026 = 24320, như file mẫu).
   ════════════════════════════════════════════════════════════════════════════════════════ */
var FC = {
  FY: 68, FY0: 24320, FY1: 24331,               /* FY68 = T09/2026 → T08/2027 */
  FROM: 23988,                                  /* chỉ xét gói từ T01/2023 */
  OUT_STAGES: { 'Trượt thầu':1, 'Không tham dự':1, 'Tạm dừng theo dõi':1 },
  STAGES: ['Chưa tiếp cận', 'Đã giới thiệu tới chuyên môn', 'Đang xây cấu hình', 'Đã gửi báo giá', 'Đang dự thầu', 'Đã trúng thầu', 'Trượt thầu', 'Không tham dự', 'Tạm dừng theo dõi'],
  PROGRESS: ['Chưa có thông tin', 'Xây dựng danh mục', 'Yêu cầu báo giá', 'Đã phê duyệt kế hoạch', 'Đã ra HSMT', 'Đang chấm thầu', 'Đã có KQLCNT'],
  CONFIG: ['Mở', 'Khóa'], CRIT: ['Giá thấp', 'Chất lượng cao'], CHANCE: ['Cao', 'Trung bình', 'Thấp'],
  GRP: { E:'① Existing', D:'② Duy trì', M:'③ Mở mới', P:'Tư nhân' },
  /* mã đại diện khi chỉ biết LOẠI dao (gói đối thủ) — để lấy giá */
  REP: { MST:'MST15', MSL:'MSL28', MCU:'MCU26', MVR:'MVR23', MSS:'MSS28', MSP:'MSP10', MCD:'MCD26', MCS:'MCS26', MRS:'MRS32', MLR:'MLR55', MGL:'MGL24' },
  TYPE_NAME: { MST:'Stab knife', MSL:'Slit knife', MCU:'Crescent knife', MVR:'MVR knife', MSS:'Slit thẳng', MSP:'Side port', MCD:'Crescent', MCS:'Crescent', MRS:'Slit R', MLR:'LRI', MGL:'Dao củng mạc', CHI:'Chỉ khâu', GHIM:'Ghim da', HOOK:'Hook', FORCEP:'Micro Forceps', KHAC:'Khác' }
};

function fcMi_(y, m){ return y * 12 + (m - 1); }
/* 'yyyy-MM…' | Date | 'MM/yyyy' ⇒ chỉ số tháng (0 nếu không đọc được) */
function fcMonth_(v){
  if(v == null || v === '') return 0;
  if(typeof v === 'number') return v > 20000 && v < 30000 ? v : (v > 190001 && v < 210012 ? fcMi_(Math.floor(v / 100), v % 100) : 0);
  if(Object.prototype.toString.call(v) === '[object Date]') return isNaN(v) ? 0 : fcMi_(v.getFullYear(), v.getMonth() + 1);
  var s = String(v).trim(), m;
  if((m = /^(\d{4})-(\d{1,2})/.exec(s))) return fcMi_(+m[1], +m[2]);
  if((m = /^(\d{1,2})\/(\d{4})$/.exec(s))) return fcMi_(+m[2], +m[1]);
  if((m = /^(\d{4})(\d{2})$/.exec(s))) return fcMi_(+m[1], +m[2]);
  return 0;
}
function fcMs_(i){ if(!i) return ''; var y = Math.floor(i / 12), m = i % 12 + 1; return (m < 10 ? '0' : '') + m + '/' + y; }   /* ⇒ 'MM/yyyy' */
function fcNum_(v){ var n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : 0; }
function fcFmt_(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function fcNk_(s){
  return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim()
    .replace(/\bbvdk\b/g, 'benh vien da khoa').replace(/\bbv\b/g, 'benh vien').replace(/\bttyt\b/g, 'trung tam y te')
    .replace(/\bdk\b/g, 'da khoa').replace(/\btw\b/g, 'trung uong').replace(/\btp\b/g, 'thanh pho').replace(/\bhcm\b/g, 'ho chi minh');
}
/* khoá bệnh viện: bỏ chữ "tỉnh" (Mắt tỉnh Phú Thọ = Mắt Phú Thọ) nhưng GIỮ "thành phố" (BV ĐK thành phố Hà Tĩnh ≠ BV ĐK tỉnh Hà Tĩnh) */
function fcHk_(name, prov){ return fcNk_(name).replace(/\btinh\b/g, ' ').replace(/\s+/g, '') + '|' + fcNk_(prov).replace(/\s+/g, ''); }

/* ── tỉnh cũ ⇒ tỉnh mới (sáp nhập 07/2025) ── */
var FC_PROV = {
  'ha giang':'Tuyên Quang', 'tuyen quang':'Tuyên Quang', 'yen bai':'Lào Cai', 'lao cai':'Lào Cai', 'bac kan':'Thái Nguyên', 'thai nguyen':'Thái Nguyên',
  'vinh phuc':'Phú Thọ', 'hoa binh':'Phú Thọ', 'phu tho':'Phú Thọ', 'bac giang':'Bắc Ninh', 'bac ninh':'Bắc Ninh', 'thai binh':'Hưng Yên', 'hung yen':'Hưng Yên',
  'hai duong':'Hải Phòng', 'hai phong':'Hải Phòng', 'ha nam':'Ninh Bình', 'nam dinh':'Ninh Bình', 'ninh binh':'Ninh Bình', 'quang binh':'Quảng Trị', 'quang tri':'Quảng Trị',
  'quang nam':'Đà Nẵng', 'da nang':'Đà Nẵng', 'kon tum':'Quảng Ngãi', 'quang ngai':'Quảng Ngãi', 'binh dinh':'Gia Lai', 'gia lai':'Gia Lai',
  'ninh thuan':'Khánh Hòa', 'khanh hoa':'Khánh Hòa', 'dak nong':'Lâm Đồng', 'binh thuan':'Lâm Đồng', 'lam dong':'Lâm Đồng', 'phu yen':'Đắk Lắk', 'dak lak':'Đắk Lắk',
  'binh duong':'Hồ Chí Minh', 'ba ria vung tau':'Hồ Chí Minh', 'vung tau':'Hồ Chí Minh', 'ho chi minh':'Hồ Chí Minh', 'binh phuoc':'Đồng Nai', 'dong nai':'Đồng Nai',
  'long an':'Tây Ninh', 'tay ninh':'Tây Ninh', 'soc trang':'Cần Thơ', 'hau giang':'Cần Thơ', 'can tho':'Cần Thơ', 'ben tre':'Vĩnh Long', 'tra vinh':'Vĩnh Long', 'vinh long':'Vĩnh Long',
  'tien giang':'Đồng Tháp', 'dong thap':'Đồng Tháp', 'bac lieu':'Cà Mau', 'ca mau':'Cà Mau', 'kien giang':'An Giang', 'an giang':'An Giang',
  'ha noi':'Hà Nội', 'hue':'Huế', 'thua thien hue':'Huế', 'lai chau':'Lai Châu', 'dien bien':'Điện Biên', 'son la':'Sơn La', 'lang son':'Lạng Sơn', 'quang ninh':'Quảng Ninh',
  'thanh hoa':'Thanh Hóa', 'nghe an':'Nghệ An', 'ha tinh':'Hà Tĩnh', 'cao bang':'Cao Bằng'
};
function fcProv_(s){
  var k = fcNk_(s).replace(/^(tinh|thanh pho)\s+/, '').replace(/\bdac\b/g, 'dak').replace(/\bthanh pho\b/g, '').replace(/\s+/g, ' ').trim();
  if(FC_PROV[k]) return FC_PROV[k];
  if(/vung tau|ba ria/.test(k)) return 'Hồ Chí Minh';
  if(/ho chi minh|sai gon/.test(k)) return 'Hồ Chí Minh';
  return String(s == null ? '' : s).trim();
}

/* ── mã sản phẩm ── */
var FC_CODE_RE = /\b(M(?:SL|ST|SS|SP|VR|PK|CU|CD|CS|CB|RS|GL|LR|DP)\d{2}[A-Z]{0,4}|MTH-S|SR-1S|(?:AZ|DS)\d{2}W?S?|\d{4}[A-Z]?)\b/g;
function fcType_(code, hint){
  var s = String(code || '').toUpperCase(), m;
  if((m = /^M(SL|ST|SS|SP|VR|PK|CU|CD|CS|CB|RS|GL|LR|DP)/.exec(s))) return { MSL:'MSL', MST:'MST', MCU:'MCU', MVR:'MVR', MSS:'MSS', MSP:'MSP', MCD:'MCD', MCS:'MCS', MCB:'MCU', MRS:'MRS', MGL:'MGL', MLR:'MLR', MDP:'MLR', MPK:'MVR' }['M' + m[1]] || 'KHAC';
  if(/^\d{4}[A-Z]?$/.test(s)) return 'CHI';
  if(/^(AZ|DS)\d{2}/.test(s) || s === 'SR-1S') return 'GHIM';
  if(s === 'MTH-S') return 'HOOK';
  var h = String(hint || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  if(/side ?port|cong ben/.test(h)) return 'MSP';
  if(/slit|rach|keratome|clear cornea/.test(h)) return 'MSL';
  if(/stab|thang|straight/.test(h)) return 'MST';
  if(/cres|liem|tunnel/.test(h)) return 'MCU';
  if(/mvr|lance|vitreo/.test(h)) return 'MVR';
  if(/chi|suture/.test(h)) return 'CHI';
  return 'KHAC';
}
function fcKind_(type){ return type === 'CHI' ? 'chi' : type === 'GHIM' ? 'ghim' : type === 'HOOK' ? 'hook' : type === 'FORCEP' ? 'forcep' : 'dao'; }
var FC_KIND_NAME = { dao:'Dao', chi:'Chỉ khâu', ghim:'Ghim da', hook:'Hook', forcep:'Micro Forceps' };
/* 1 ô "Product code" ⇒ [{code, qty}] — "MST15SK 400 cái, MSL28SK 400 cái" lấy SL ghi rõ; "MSL22SH/MSL28SH" (chọn 1 trong các cỡ) giữ chung 1 dòng;
   nhiều loại cách nhau bằng , ; + mà không ghi SL ⇒ chia đều SL dòng cho các loại (như file mẫu) */
function fcSplit_(cell, qty){
  var s = String(cell || '').toUpperCase().replace(/\s+/g, ' ').trim();
  if(!s) return [];
  var withQ = [], re = /(M(?:SL|ST|SS|SP|VR|PK|CU|CD|CS|CB|RS|GL|LR|DP)\d{2}[A-Z]{0,4}|\d{4}[A-Z]?)\s*[:\-x×]?\s*\(?\s*(\d[\d.,]*)\s*(?:CÁI|CAI|SỢI|SOI|C\b|S\b)/g, m;
  while((m = re.exec(s))) withQ.push({ code:m[1], qty:fcNum_(m[2].replace(/[.,]/g, '')) });
  if(withQ.length >= 2) return withQ;
  var groups = s.split(/\s*[,;+&\n]\s*|\s+VÀ\s+/).map(function(g){
    var c = g.match(FC_CODE_RE); return c ? c.join('/') : '';
  }).filter(Boolean);
  var seen = {}; groups = groups.filter(function(g){ if(seen[g]) return false; seen[g] = 1; return true; });
  if(!groups.length) return [{ code:s.slice(0, 40), qty:qty }];
  if(groups.length === 1) return [{ code:groups[0], qty:qty }];
  var each = Math.floor(qty / groups.length), rest = qty - each * groups.length;
  return groups.map(function(g, i){ return { code:g, qty:each + (i === 0 ? rest : 0) }; });
}

/* ── LÕI: gói đã chuẩn hoá ⇒ dòng tự động ──
   pkg = { src:'HV'|'IC'|'KQ', npp, tbmt, hosp, prov, addr, region, start (chỉ số tháng phê duyệt / 0), dur, res:'Win'|'Fail'|'Pending'|'Cancel',
           items:[{ code, type, qty, brand, mani:bool }] }   (KQ: mọi hãng; NPP: hàng MANI)
   ⇒ [{ id, caseId, kenh, grp, npp, hosp, prov, addr, tbmt, now, kind, type, code, qty, dur, start, others, src, stage }] */
function fcBuild_(pkgs, opt){
  opt = opt || {};
  var FY0 = FC.FY0, FY1 = FC.FY1;
  /* 1) gộp gói trùng TBMT giữa nguồn (NPP ưu tiên cho hàng MANI; KQ cho hàng đối thủ) + tên bệnh viện theo TBMT */
  var byTb = {}, alias = {};
  pkgs.forEach(function(p){ p.prov = fcProv_(p.prov); p.hk = fcHk_(p.hosp, p.prov); var t = String(p.tbmt || '').replace(/\s+/g, '').toUpperCase().replace(/-\d{1,2}$/, ''); p.tb = /^IB\d{6,}/.test(t) ? t : ''; });
  pkgs.forEach(function(p){ if(p.tb && p.src !== 'KQ'){ (byTb[p.tb] = byTb[p.tb] || []).push(p); } });
  pkgs.forEach(function(p){ if(p.tb && p.src === 'KQ' && byTb[p.tb]){ var n = byTb[p.tb][0]; if(n.hk !== p.hk) alias[p.hk] = n.hk; } });
  var H = {};
  pkgs.forEach(function(p){
    if(p.start && p.start < FC.FROM) return;
    var hk = alias[p.hk] || p.hk, h = H[hk];
    if(!h){ h = H[hk] = { hk:hk, hosp:p.hosp, prov:p.prov, addr:p.addr || '', region:p.region || '', npp:'', pk:[] }; }
    if(p.src !== 'KQ'){ h.hosp = p.hosp || h.hosp; if(!h.npp) h.npp = p.npp; }
    if(!h.addr && p.addr) h.addr = p.addr;
    if(!h.region && p.region) h.region = p.region;
    h.pk.push(p);
  });
  var rows = [], fmtQ = fcFmt_;
  Object.keys(H).forEach(function(hk){
    var h = H[hk];
    /* gói đã có kết quả (trúng) theo TBMT: hàng MANI lấy từ NPP, hàng đối thủ từ KQ */
    var res = {};                                   /* tb|key ⇒ { start, dur, end, mani:{type:[items]}, comp:{type:[items]}, npp, src, tbmt } */
    h.pk.forEach(function(p){
      if(p.res !== 'Win' && p.src !== 'KQ') return;
      var key = p.tb || (p.src + '|' + p.start + '|' + p.hosp), r = res[key];
      if(!r){ r = res[key] = { key:key, tbmt:p.tb || p.tbmt || '', start:p.start, dur:p.dur || 12, mani:{}, comp:{}, npp:'', src:p.src }; }
      if(p.src !== 'KQ'){ r.npp = p.npp; r.src = p.src; if(p.start) r.start = p.start; if(p.dur) r.dur = p.dur; r.fromNpp = true; }
      else { if(!r.start) r.start = p.start; if(!r.fromNpp && p.dur) r.dur = p.dur; }
      p.items.forEach(function(it){
        it.src = p.src;
        if(it.mani && p.src === 'KQ' && r.fromNpp) return;                     /* đã có hàng MANI của NPP */
        var bucket = it.mani ? r.mani : r.comp;
        (bucket[it.type] = bucket[it.type] || []).push(it);
      });
    });
    /* NPP đã có hàng MANI ⇒ bỏ hàng MANI của KQ cùng TBMT (tránh cộng 2 lần) */
    Object.keys(res).forEach(function(k){ var r = res[k]; if(r.fromNpp) Object.keys(r.mani).forEach(function(t){ r.mani[t] = r.mani[t].filter(function(it){ return it.src !== 'KQ'; }); if(!r.mani[t].length) delete r.mani[t]; }); });
    var W = Object.keys(res).map(function(k){ var r = res[k]; r.end = r.start ? r.start + (r.dur || 12) - 1 : 0; return r; })
      .filter(function(r){ return Object.keys(r.mani).length || Object.keys(r.comp).length; })
      .sort(function(a, b){ return (b.start || 0) - (a.start || 0); });
    var npp = function(r){ return (r && r.npp) || h.npp || (/south|nam/i.test(h.region) ? 'I-Care' : /north|bac/i.test(h.region) ? 'Hùng Vĩ' : ''); };
    var nowTxt = function(r){
      if(!r) return '';
      var L = [];
      Object.keys(r.mani).forEach(function(t){ var q = r.mani[t].reduce(function(a, it){ return a + it.qty; }, 0); L.push('Mani trúng ' + fmtQ(q) + ' ' + (FC.TYPE_NAME[t] || t)); });
      Object.keys(r.comp).forEach(function(t){
        var by = {}; r.comp[t].forEach(function(it){ var b = it.brand || 'Hãng khác'; by[b] = (by[b] || 0) + it.qty; });
        Object.keys(by).forEach(function(b){ L.push(b + ' trúng ' + fmtQ(by[b]) + ' ' + (FC.TYPE_NAME[t] || t)); });
      });
      return L.join('\n') + (r.end ? '\n(Hiệu lực thầu: đến hết T' + fcMs_(r.end) + ')' : '');
    };
    var base = function(r){ return { kenh:'Thầu', npp:npp(r), hosp:h.hosp, prov:h.prov, addr:h.addr, tbmt:(r && r.tbmt) || '', now:nowTxt(r) }; };
    var add = function(o){ o.kind = fcKind_(o.type); rows.push(o); };
    /* ① Existing: mọi gói MANI đã trúng còn hiệu lực trong FY */
    W.forEach(function(r){
      if(!r.start || r.end < FY0 || r.start > FY1) return;
      Object.keys(r.mani).forEach(function(t){
        r.mani[t].forEach(function(it, j){
          var b = base(r); b.id = 'E|' + (r.tbmt || r.key) + '|' + it.code + (j ? '#' + j : ''); b.caseId = r.tbmt || r.key;
          b.grp = FC.GRP.E; b.type = t; b.code = it.code; b.qty = it.qty; b.dur = r.dur; b.start = r.start; b.others = 0; b.src = it.src || r.src; b.stage = 'Đã trúng thầu';
          add(b);
        });
      });
    });
    /* gói gần nhất của bệnh viện ⇒ ai giữ từng loại dao */
    var cur = W[0] || null;
    var nextStart = function(end){ return end >= FY0 - 1 ? end + 1 : 0; };     /* hết đúng T08 ⇒ bắt đầu T09; hết sớm hơn ⇒ chưa rõ mốc (trống) */
    /* đang dự thầu (NPP, chưa có kết quả) mới hơn gói gần nhất ⇒ là gói kế tiếp */
    var pend = h.pk.filter(function(p){ return p.src !== 'KQ' && p.res === 'Pending' && (!cur || !p.start || p.start >= (cur.start || 0)); });
    var pendType = {};
    pend.forEach(function(p){
      p.items.forEach(function(it, j){
        var held = cur && cur.mani[it.type], hEnd = cur ? cur.end : 0;
        var b = base(cur); b.npp = p.npp || b.npp; b.tbmt = p.tb || p.tbmt || ''; b.id = 'B|' + (b.tbmt || p.hosp + '|' + p.start) + '|' + it.code + (j ? '#' + j : '');
        b.caseId = b.tbmt || ('B|' + h.hk); b.grp = held ? FC.GRP.D : FC.GRP.M; b.type = it.type; b.code = it.code; b.qty = it.qty; b.dur = p.dur || (cur && cur.dur) || 12;
        b.start = hEnd ? nextStart(hEnd) : 0;
        b.others = cur && cur.comp[it.type] ? cur.comp[it.type].reduce(function(a, x){ return a + x.qty; }, 0) : 0; b.src = p.src; b.stage = 'Đang dự thầu';
        pendType[it.type] = 1; add(b);
      });
    });
    if(!cur) return;
    /* ② Duy trì: loại dao MANI giữ ở gói gần nhất, gói hết hạn trước cuối FY */
    if(cur.end < FY1){
      Object.keys(cur.mani).forEach(function(t){
        if(pendType[t]) return;
        cur.mani[t].forEach(function(it, j){
          var b = base(cur); b.id = 'D|' + (cur.tbmt || cur.key) + '|' + it.code + (j ? '#' + j : ''); b.caseId = 'D|' + (cur.tbmt || cur.key);
          b.grp = FC.GRP.D; b.type = t; b.code = it.code; b.qty = it.qty; b.dur = cur.dur; b.start = nextStart(cur.end); b.others = 0; b.src = it.src || cur.src; b.stage = '';
          add(b);
        });
      });
    }
    /* ③ Mở mới: loại dao hãng khác giữ ở gói gần nhất (MANI không có trong gói đó) */
    Object.keys(cur.comp).forEach(function(t){
      if(cur.mani[t] || pendType[t] || t === 'KHAC') return;               /* loại dao không xác định được ⇒ không có mã MANI tương đương */
      var oth = cur.comp[t].reduce(function(a, x){ return a + x.qty; }, 0);
      /* NPP đã chào mà trượt gói này ⇒ SL mặc định = SL đã chào, giai đoạn "Trượt thầu" */
      var lost = h.pk.filter(function(p){ return p.src !== 'KQ' && p.res === 'Fail' && p.tb && p.tb === cur.tbmt; })[0];
      var offered = lost ? lost.items.filter(function(it){ return it.type === t; }) : [];
      var list = offered.length ? offered : [{ code:FC.REP[t] || t, qty:0, src:'KQ' }];
      list.forEach(function(it, j){
        var b = base(cur); b.id = 'M|' + (cur.tbmt || cur.key) + '|' + t + (j ? '#' + j : ''); b.caseId = 'M|' + (cur.tbmt || cur.key);
        b.grp = FC.GRP.M; b.type = t; b.code = it.code; b.qty = it.qty || 0; b.dur = cur.dur || 12; b.start = nextStart(cur.end); b.others = oth;
        b.src = lost ? lost.src : 'KQ'; b.stage = lost ? 'Trượt thầu' : '';
        if(lost) b.npp = lost.npp || b.npp;
        add(b);
      });
    });
  });
  return rows;
}

/* tính doanh số 1 dòng: SL/tháng = SL ÷ hiệu lực; tháng chạy = [bắt đầu, bắt đầu + hiệu lực − 1] ∩ FY; giá theo mã (đơn giá NPP / cái) */
function fcCalc_(r, price){
  var q = fcNum_(r.qty), d = fcNum_(r.dur) || 12, s = +r.start || 0, per = d > 0 ? q / d : 0;
  var a = Math.max(s, FC.FY0), b = Math.min(s ? s + d - 1 : 0, FC.FY1), n = s && b >= a ? b - a + 1 : 0;
  var months = []; for(var i = FC.FY0; i <= FC.FY1; i++) months.push(s && i >= a && i <= b ? per : 0);
  var pr = fcNum_(price);
  return { per:per, n:n, qtyFy:per * n, price:pr, valMonth:per * pr, valFy:per * n * pr, months:months, end:s ? s + d - 1 : 0 };
}
/* dòng có được cộng vào dự báo không (lý do nếu không) */
function fcIn_(r){
  if(FC.OUT_STAGES[r.stage]) return 'Giai đoạn: ' + r.stage;
  if(r.stale) return r.stale;
  if(!(fcNum_(r.qty) > 0)) return 'Chưa có SL';
  if(!(+r.start > 0)) return 'Chưa có tháng bắt đầu';
  return '';
}
