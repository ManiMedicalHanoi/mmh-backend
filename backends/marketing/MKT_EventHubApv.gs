/*************************************************************************************************
 * MMH — MKT_EventHubApv.gs   (Event Hub v2.3 · 18/11/2026) — DUYỆT ẤN PHẨM / BÀI ĐĂNG 3 CẤP (người dùng chốt 18/11/2026):
 *  Minh Trang (bài đăng MKT Online) · Đức Anh (thiết kế: ấn phẩm, designer bên ngoài, thiết kế khác) nộp BẢN NHÁP ⇒ lưu folder "Draft" trong MKT Online
 *  (EH_DIR.ONLINE ▸ Draft ▸ Sự kiện / Sản phẩm / Khác) ⇒ ① Thương duyệt ⇒ ② Giang xác nhận nội dung (email tới người làm, CC Thương · chị Hà · chị Tuyên)
 *  ⇒ ③ chị Tuyên duyệt cuối ⇒ thiết kế: file CHUYỂN vào folder lưu bản cuối — ấn phẩm sản phẩm = folder kho Product Data theo nhóm SP × loại (EH_APV.PD),
 *  ấn phẩm sự kiện = "Event Access" của sự kiện; bài đăng: bước ④ Đăng bài (người làm dán link bài đăng — chỉ lưu link, người làm tự ghi vào file MKT Online report).
 *  Trả lại ở bước nào ⇒ về người làm (giữ file nháp, ghi nhận xét), nộp lại ⇒ bắt đầu lại từ bước ①.
 *  Tab APPROVALS (file Event Hub). ehSave op: apv.add · apv.decide (act approve|return, note) · apv.post (url) · apv.resubmit · apv.delete; ehUpload với apvId ⇒ vào folder Draft.
 *  Người duyệt đổi được bằng Script Property EH_APV_STEPS (JSON [{who,label}]).
 *************************************************************************************************/
var EH_APV = {
  STEPS: [{ who: 'Thuong', label: 'Thương duyệt' }, { who: 'Giang', label: 'Giang xác nhận nội dung' }, { who: 'Tuyen', label: 'Chị Tuyên duyệt cuối' }],
  CC2: ['Thuong', 'Nguyen Ha', 'Tuyen'],
  COLS: ['id', 'kind', 'scope', 'eventId', 'taskId', 'title', 'product', 'docType', 'external', 'by', 'files', 'draftId', 'step', 'status', 'hist', 'postUrl', 'finalUrl', 'note', 'createdAt', 'updatedAt', 'sample'],
  DOC: { poster: 'Poster', brochure: 'Catalogue / Flyer / Brochure', banner: 'Banner', posm: 'POSM', standee: 'Standee', video: 'Video', rawPhoto: 'Ảnh', post: 'Bài đăng', other: 'Khác' },
  PD: {"Dental_Hand Files":{"poster":"118kHa6viiqokdSEarZJX_mawIqoOpsLs","brochure":"10r1A_Z2F7ZZrlowkpgelTtsbGJmSnNj8","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"1m1Q4KmJT_RVTHIHI2jiQ9rr2DwpGfdEm"},"Dental_Rotary Files":{"poster":"1jVOYF9XobKx1tkHVg_2Wr8vVOs2kiw8O","brochure":"1Un371-SyRxz7BLChZl0_QRBDE8vpYoti","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"12y56xZYVPuVpLZjjrWrYbwQQz6m8Z4iN"},"Dental_Accessories":{"poster":"1-X7EHWM-i1vOv6GwNu5gITcJ1VNYa0OF","brochure":"1yQ7KdiecsfsbIBpDltCq9cBuBjRimD6v","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"18ulIBA33SXA91SzVC5FL9WuK4BLrcJAM"},"Dental_Micro Accessories":{"poster":"1eHjGSYa9TNJMvpfiywlaTqq0sufDVI9e","brochure":"1wzfIG9BYQRTu0c1Fyc4ujN6MMFIW2VG6","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"1g88XT1QSEcnVba_G1OnKEW7PRiNGAQuP"},"Dental_Diamond Burs":{"poster":"1tyoyxnBG3deGeylS_ONxLRZrVWorDqId","brochure":"1uKvUKHUVLjqXW4vK3jNlf7xp7up68FpJ","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"1Fw99mU1gmFWjHEyFzmvD-r5OfDc0BTvr"},"Dental_Carbide Burs":{"poster":"1N64CirOJxbvQ57MseIo257tN03T1Xxeh","brochure":"1kDY5-oBNAKZIBDRJ1LEJM4CUuxDmDuQo","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"1x1Ey-AItGDh9Y_W2PwLyUs6SIfFcpya_"},"Dental_Surgical Burs":{"poster":"1V0Z7r8cgKyt2hjTlrLJiSXAoRhBZD2_1","brochure":"148Rc3AMXXluB6cDxcxeSdp9ZXacig3ip","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"1QpHHKX1GNi1jZiMYlMLB6ulE4HoVkI-Z"},"Dental_Stainless Steel Burs":{"poster":"1IHTxT6GPXilmUlZLE-_iSMIjVDzD9YJl","brochure":"1KSNMDmHW-T8jkZ3Ul0JVJ28Lzya3X-J4","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"1HY4ACMG_RZY--lZwe5JvA-GKAe_0TMQN"},"Dental_Composite":{"poster":"1B_F2OJra7tePTRISy_2xj1IVtXWLujaD","brochure":"1nv0uCIj6Jd48IHsaLLf3e5WYWA1b1uAM","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"1T8Bx2HRTk9eA7GMOY0X4WLOSO-Y5-MkM"},"Dental_Bleaching":{"poster":"1LMGbStqFAjKLS8A7lgUWeyAUcdDx85lR","brochure":"1EbsfUiIqOfxlS_SW2HCRuP3LqjXkxlFl","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"1qdr5-QNe244t2uqavaGhs3hFwHqoIX3x"},"Dental_Bond":{"poster":"15Fq35BLtYuMA4lOs52QkcFzcVKrpoKD6","brochure":"1YX6Zy6kvJGg9N5Bd0GxYPe42efCSj8HM","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"1txy1pTtFN5x6QxJV6Mq-NTa2IoFuzqVu"},"Dental_Acrylic":{"poster":"1wh73TuIuIvliA_-3VgvCNfSV2fWH7IBP","brochure":"1Yc6R7G-khv8ZqXhio4Y9qfSzu9pqUmsA","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"15TUne1gyKJB9KqaBEHT0Mt92zEwtB6Bq"},"Ophthalmic_Suture":{"poster":"1pc87gzU7jSP4hhPpAHMtDw254bGFAbiV","brochure":"1NwyTVLau15JpEM0t9DtTx_JgB2Oh7WsY","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"1kzVGPno65iP0LlMK_zlcw5kdQ8eQOmhE"},"Ophthalmic_Knife":{"poster":"1o_jAVOjiSM_GtTFSxV9jAubCgAv9WzQS","brochure":"1eQEWNx-2NAirHQ-fSd_SbN1lENk3afCt","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"1uKajgYrpEfBWkl78mFS3WrgmmpRmh_eI"},"Surgical_Skin Stapler":{"poster":"1E_fZAXPH_JhmY_C8jpf55zXi7W7Z1L4E","brochure":"1nSMV_H6UcCoqfq1GW5oPdKB2LZE3EfBN","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"1HcvlVvQrfbwHo-wZzxY_NzKdUk_BL1fb"},"Surgical_Vessel Knife":{"poster":"1XuAHpbOkCTTKdu6Z4d7WkNVy5pDEaaTe","brochure":"1zUyAHaM_EM0COHv3dkXyip54Z-Bl8pTO","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"1PeAvaXG6zWOw1gh2UkHxFQacq1sTwS3w"},"Eyeless_Needles":{"poster":"1NMwatPmRa8hyqYNNvkdCkWDTZLYvqBkE","brochure":"1RhCqMx7pFVgo1tOOZV-4f3xn8Ksp6UR4","banner":"1I78rd3mEGUwtBh8CK3ZS2q_IqYFKfFTn","posm":"1Rv1l8PdPnooFgfPNH69KO3CWtPN5NQmG","standee":"1GNFUgICh-Pi4i7dfycoM0-qwkxKb86kk","video":"11P-m05q7TFW_xUxe8JYd9kRmVvcvGnxG","rawPhoto":"142-sG5M50d4f2UlPf7Ah2-1HMKm3eynb"}}
};
function ehApvSteps_(){ try { var x = JSON.parse(PropertiesService.getScriptProperties().getProperty('EH_APV_STEPS') || 'null'); if (x && x.length) return x; } catch(e){} return EH_APV.STEPS; }
function ehApvSheet_(ss){
  var sh = ss.getSheetByName('APPROVALS');
  if (!sh){ sh = ss.insertSheet('APPROVALS'); sh.getRange(1, 1, 1, EH_APV.COLS.length).setValues([EH_APV.COLS]).setFontWeight('bold').setBackground('#2C4A5E').setFontColor('#FFFFFF'); sh.setFrozenRows(1); }
  return sh;
}
function ehApvList_(ss){ ehApvSheet_(ss); return ehRead_(ss, 'APPROVALS').map(function(a){ var o = ehClean2_(a); o._r = a._r; try { o.files = JSON.parse(a.files || '[]'); } catch(e){ o.files = []; } try { o.hist = JSON.parse(a.hist || '[]'); } catch(e){ o.hist = []; } return o; }); }
function ehApvPut_(ss, a){ var o = {}; for (var k in a) o[k] = a[k]; o.files = JSON.stringify(a.files || []); o.hist = JSON.stringify(a.hist || []).slice(0, 45000); if (a._r) ehPut_(ss, 'APPROVALS', EH_APV.COLS, o); else { ehAppend_(ss, 'APPROVALS', EH_APV.COLS, [o]); a._r = ss.getSheetByName('APPROVALS').getLastRow(); } }
function ehApvSub_(parent, name){ var it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
/* folder nháp: MKT Online ▸ Draft ▸ Sự kiện ▸ <tên sự kiện> | Sản phẩm ▸ <nhóm SP> | Khác */
function ehApvDraftDir_(a, ev){
  var d = ehApvSub_(DriveApp.getFolderById(EH_DIR.ONLINE), 'Draft');
  if (a.scope === 'event' && ev) return ehApvSub_(ehApvSub_(d, 'Sự kiện'), ehEvDirName_(ev).slice(0, 120));
  if (a.scope === 'product' && a.product) return ehApvSub_(ehApvSub_(d, 'Sản phẩm'), a.product);
  return ehApvSub_(d, 'Khác');
}
/* nơi lưu bản cuối */
function ehApvFinalDir_(a, ev){
  if (a.scope === 'event' && ev){ var fo = ehEvDirOf_(ev); return fo ? ehEvSubFor_(fo, null, '') : null; }
  if (a.scope === 'product'){ var m = EH_APV.PD[a.product] || {}, id = m[a.docType]; if (id) try { return DriveApp.getFolderById(id); } catch(e){} }
  return null;
}
function ehApvMail_(to, cc, subject, paras, replyTo){
  var U = ehUsers_(), mail = function(p){ return (U[p] && U[p].email) || ''; };
  var t = (Array.isArray(to) ? to : [to]).map(mail).filter(String), c = (cc || []).map(mail).filter(function(x){ return x && t.indexOf(x) < 0; });
  if (!t.length) return 'không có email';
  var L = ehLetter_(Array.isArray(to) ? to.join(', ') : to, paras);
  try { mmhMail_({ to: t.join(','), cc: c.join(','), subject: subject, htmlBody: L.html, body: L.text, name: 'Sự kiện MKT · MMH', replyTo: replyTo ? mail(replyTo) : undefined }); return 'Đã gửi'; }
  catch(e){ return 'Lỗi: ' + String(e.message || e).slice(0, 120); }
}
function ehApvFeed_(pics, by, a, text){
  var url = EH.APP_URL + '#apv-' + encodeURIComponent(a.id);
  ehFeed_(pics.filter(function(p, i){ return p && pics.indexOf(p) === i && p !== by; }).map(function(p){
    return ['N' + Utilities.getUuid().replace(/-/g, '').slice(0, 12), new Date(), p, 'event', 'approve', ('Duyệt ' + (a.kind === 'post' ? 'bài đăng' : 'ấn phẩm') + ': ' + a.title).slice(0, 300), String(text || '').slice(0, 900), url, by, ehS_(a.eventId), '', ''];
  }));
}
function ehApvLine_(a, ev){
  var L = [['Loại', a.kind === 'post' ? 'Bài đăng MKT Online' : 'Thiết kế' + (a.external === 'x' ? ' (designer bên ngoài)' : '')], ['Nội dung', a.title],
           ['Thuộc', a.scope === 'event' && ev ? 'Sự kiện ' + ev.name : a.scope === 'product' ? 'Sản phẩm ' + a.product : 'Khác'], ['Người làm', a.by],
           ['File nháp', (a.files || []).map(function(f){ return f.name; }).join(', ') || '(link)']];
  return { html: '<table style="border-collapse:collapse;margin:6px 0 12px">' + L.map(function(r){ return '<tr><td style="padding:3px 14px 3px 0;color:#4F5B68">' + r[0] + '</td><td style="padding:3px 0;font-weight:600">' + ehH_(r[1]) + '</td></tr>'; }).join('') + '</table>' +
           '<p><a href="' + EH.APP_URL + '#apv-' + encodeURIComponent(a.id) + '">Mở trên app để xem và duyệt</a></p>',
           text: L.map(function(r){ return r[0] + ': ' + r[1]; }).join('\n') + '\nMở app: ' + EH.APP_URL + '#apv-' + a.id };
}
/* ehSave op apv.* — me = người đăng nhập */
function ehApvOp_(ss, me, op, d, evBy){
  var L = ehApvList_(ss), a = L.filter(function(x){ return x.id === ehS_(d.id); })[0], S = ehApvSteps_(), now = ehNow_();
  var ev = function(x){ return x && x.eventId ? evBy[ehS_(x.eventId)] : null; };
  if (op === 'apv.add'){
    var kind = d.kind === 'post' ? 'post' : 'design', scope = /^(event|product|other)$/.test(d.scope) ? d.scope : 'other';
    if (!ehS_(d.title)) return { ok:false, error:'Cần tên ấn phẩm / bài đăng.' };
    if (scope === 'event' && !evBy[ehS_(d.eventId)]) return { ok:false, error:'Không thấy sự kiện.' };
    a = { id: ehId_('A'), kind: kind, scope: scope, eventId: scope === 'event' ? ehS_(d.eventId) : '', taskId: ehS_(d.taskId), title: ehS_(d.title).slice(0, 300),
          product: scope === 'product' ? ehS_(d.product) : '', docType: kind === 'post' ? 'post' : (EH_APV.DOC[d.docType] ? d.docType : 'other'), external: d.external ? 'x' : '',
          by: me.pic, files: [], draftId: '', step: 1, status: 'Chờ duyệt', hist: [{ at: now, by: me.pic, act: 'Nộp bản nháp', note: ehS_(d.note) }], postUrl: '', finalUrl: '', note: ehS_(d.note).slice(0, 1000),
          createdAt: now, updatedAt: now, sample: '' };
    if (ehS_(d.link)) a.files.push({ name: 'Link', url: ehS_(d.link) });
    try { var dd = ehApvDraftDir_(a, ev(a)); a.draftId = dd.getId(); } catch(e){}
    ehApvPut_(ss, a); ehLog_(ss, me, 'Nộp duyệt', a.eventId, a.taskId, a.title);
    if (!d.later) ehApvNotifyStep_(a, ev(a), me.pic);
    return { ok:true, apv: ehApvOut_(a) };
  }
  if (!a) return { ok:false, error:'Không thấy yêu cầu duyệt.' };
  if (op === 'apv.submit'){   /* đã tải xong file ⇒ báo người duyệt bước 1 */
    if (a.by !== me.pic && !me.manager) return { ok:false, code:'PERM', error:'Chỉ người nộp được gửi.' };
    ehApvNotifyStep_(a, ev(a), me.pic); return { ok:true, apv: ehApvOut_(a) };
  }
  if (op === 'apv.decide'){
    var st = S[(+a.step || 1) - 1]; if (!st || a.status !== 'Chờ duyệt') return { ok:false, error:'Yêu cầu không ở trạng thái chờ duyệt.' };
    if (me.pic !== st.who && !me.admin) return { ok:false, code:'PERM', error:'Bước này do ' + st.who + ' duyệt.' };
    var note = ehS_(d.note).slice(0, 1000);
    if (d.act === 'return'){
      if (!note) return { ok:false, error:'Ghi nhận xét cần chỉnh sửa.' };
      a.status = 'Trả lại'; a.hist.push({ at: now, by: me.pic, act: 'Trả lại ở bước ' + a.step, note: note }); a.updatedAt = now; ehApvPut_(ss, a);
      ehApvMail_(a.by, [S[0].who], '[Sự kiện MKT] Cần chỉnh sửa: ' + a.title, [{ html: '<p><b>' + ehH_(me.pic) + '</b> trả lại bản nháp, cần chỉnh sửa:</p><p style="border-left:3px solid #BCD4E6;padding-left:10px">' + ehH_(note) + '</p>', text: me.pic + ' trả lại, cần chỉnh sửa:\n' + note }, ehApvLine_(a, ev(a))], me.pic);
      ehApvFeed_([a.by], me.pic, a, 'Trả lại: ' + note); ehLog_(ss, me, 'Trả lại duyệt', a.eventId, a.taskId, a.title + ' · ' + note);
      return { ok:true, apv: ehApvOut_(a) };
    }
    a.hist.push({ at: now, by: me.pic, act: st.label, note: note });
    if (+a.step === 2){   /* Giang xác nhận nội dung ⇒ email người làm, CC Thương · chị Hà · chị Tuyên */
      ehApvMail_(a.by, EH_APV.CC2, '[Sự kiện MKT] Đã xác nhận nội dung: ' + a.title,
        [{ html: '<p>Tôi xác nhận <b>nội dung</b> của ' + (a.kind === 'post' ? 'bài đăng' : 'ấn phẩm') + ' này là OK ở phía tôi.' + (note ? ' Ghi chú: ' + ehH_(note) : '') + '</p><p>Chuyển chị Tuyên duyệt cuối.</p>',
           text: 'Tôi xác nhận nội dung là OK ở phía tôi.' + (note ? ' Ghi chú: ' + note : '') + '\nChuyển chị Tuyên duyệt cuối.' }, ehApvLine_(a, ev(a))], me.pic);
    }
    a.step = (+a.step || 1) + 1; a.updatedAt = now;
    if (a.step > S.length){
      a.status = a.kind === 'post' ? 'Chờ đăng' : 'Đã duyệt';
      if (a.kind !== 'post'){ var mv = ehApvMoveFinal_(a, ev(a)); a.hist.push({ at: now, by: 'Hệ thống', act: mv.msg }); }
      ehApvPut_(ss, a);
      ehApvMail_(a.by, [S[0].who], '[Sự kiện MKT] Đã duyệt: ' + a.title, [{ html: '<p>' + (a.kind === 'post' ? 'Bài đăng đã được duyệt. Đăng bài rồi dán <b>link bài đăng</b> vào app (và file MKT Online report).' : 'Ấn phẩm đã được duyệt' + (a.finalUrl ? ', file đã chuyển vào <a href="' + a.finalUrl + '">folder lưu bản cuối</a>.' : '.')) + '</p>',
        text: a.kind === 'post' ? 'Bài đăng đã duyệt. Đăng bài rồi dán link vào app.' : 'Ấn phẩm đã duyệt.' }, ehApvLine_(a, ev(a))], me.pic);
      ehApvFeed_([a.by, S[0].who], me.pic, a, a.kind === 'post' ? 'Đã duyệt — chờ đăng bài' : 'Đã duyệt');
    } else { ehApvPut_(ss, a); ehApvNotifyStep_(a, ev(a), me.pic); }
    ehLog_(ss, me, 'Duyệt bước ' + (a.step - 1), a.eventId, a.taskId, a.title);
    return { ok:true, apv: ehApvOut_(a) };
  }
  if (op === 'apv.resubmit'){
    if (a.by !== me.pic && !me.manager) return { ok:false, code:'PERM', error:'Chỉ người nộp được gửi lại.' };
    a.step = 1; a.status = 'Chờ duyệt'; a.updatedAt = now; a.hist.push({ at: now, by: me.pic, act: 'Nộp lại', note: ehS_(d.note) }); ehApvPut_(ss, a);
    ehApvNotifyStep_(a, ev(a), me.pic); return { ok:true, apv: ehApvOut_(a) };
  }
  if (op === 'apv.post'){
    if (a.kind !== 'post') return { ok:false, error:'Chỉ bài đăng.' };
    if (a.by !== me.pic && !me.manager) return { ok:false, code:'PERM', error:'Chỉ người làm được ghi link bài đăng.' };
    if (!/^https?:\/\//.test(ehS_(d.url))) return { ok:false, error:'Dán link bài đăng.' };
    a.postUrl = ehS_(d.url); a.status = 'Đã đăng'; a.updatedAt = now; a.hist.push({ at: now, by: me.pic, act: 'Đã đăng bài', note: a.postUrl }); ehApvPut_(ss, a);
    ehApvFeed_([S[0].who], me.pic, a, 'Đã đăng: ' + a.postUrl); return { ok:true, apv: ehApvOut_(a) };
  }
  if (op === 'apv.delete'){
    if (a.by !== me.pic && !me.manager) return { ok:false, code:'PERM', error:'Chỉ người nộp hoặc quản lý được xoá.' };
    if (/Đã duyệt|Chờ đăng|Đã đăng/.test(a.status) && !me.manager) return { ok:false, error:'Đã duyệt — chỉ quản lý được xoá.' };
    ss.getSheetByName('APPROVALS').deleteRow(a._r); return { ok:true, deleted: a.id };
  }
  return { ok:false, error:'Không rõ thao tác duyệt.' };
}
function ehApvNotifyStep_(a, ev, by){
  var st = ehApvSteps_()[(+a.step || 1) - 1]; if (!st) return;
  ehApvMail_(st.who, [], '[Sự kiện MKT] Chờ bạn duyệt: ' + a.title, [{ html: '<p><b>' + ehH_(a.by) + '</b> gửi ' + (a.kind === 'post' ? 'bài đăng' : 'ấn phẩm') + ' chờ bạn duyệt (' + ehH_(st.label) + ').</p>', text: a.by + ' gửi chờ bạn duyệt (' + st.label + ').' }, ehApvLine_(a, ev)], a.by);
  ehApvFeed_([st.who], by, a, 'Chờ bạn duyệt · ' + st.label);
}
/* duyệt xong ⇒ chuyển file nháp vào folder bản cuối (giữ nguyên file, chỉ đổi folder) */
function ehApvMoveFinal_(a, ev){
  var to = null; try { to = ehApvFinalDir_(a, ev); } catch(e){}
  if (!to) return { msg: 'Chưa có folder lưu bản cuối (chọn nhóm sản phẩm / loại ấn phẩm) — file vẫn ở Draft' };
  var n = 0; (a.files || []).forEach(function(f){ if (!f.driveId) return; try { DriveApp.getFileById(f.driveId).moveTo(to); n++; f.url = 'https://drive.google.com/file/d/' + f.driveId + '/view'; } catch(e){} });
  a.finalUrl = to.getUrl();
  return { msg: 'Chuyển ' + n + ' file vào ' + to.getName() };
}
function ehApvOut_(a){ var o = {}; for (var k in a) if (k !== '_r') o[k] = a[k]; return o; }
/* ehUpload với apvId ⇒ file vào folder Draft của yêu cầu */
function ehApvUpload_(ss, me, p){
  var L = ehApvList_(ss), a = L.filter(function(x){ return x.id === ehS_(p.apvId); })[0]; if (!a) return { ok:false, error:'Không thấy yêu cầu duyệt.' };
  if (a.by !== me.pic && !me.manager) return { ok:false, code:'PERM', error:'Chỉ người nộp được tải file.' };
  var b64 = String(p.data || '').replace(/^data:[^,]*,/, ''); if (!b64) return { ok:false, error:'Thiếu nội dung file.' };
  if (b64.length * 0.75 > EH.MAX_MB * 1048576) return { ok:false, error:'File lớn hơn ' + EH.MAX_MB + ' MB — tải lên Drive rồi dán link.' };
  var fo; try { fo = a.draftId ? DriveApp.getFolderById(a.draftId) : null; } catch(e){ fo = null; }
  if (!fo){ var evx = null; ehRead_(ss, 'EVENTS').forEach(function(e){ if (ehS_(e.id) === a.eventId) evx = e; }); fo = ehApvDraftDir_(a, evx); a.draftId = fo.getId(); }
  var name = ehS_(p.name) || 'ban-nhap', file = fo.createFile(Utilities.newBlob(Utilities.base64Decode(b64), ehS_(p.mime) || 'application/octet-stream', name));
  a.files.push({ name: name, driveId: file.getId(), url: file.getUrl(), mime: ehS_(p.mime), at: ehNow_() }); a.updatedAt = ehNow_();
  if (a.status === 'Trả lại') a.hist.push({ at: ehNow_(), by: me.pic, act: 'Tải bản sửa', note: name });
  ehApvPut_(ss, a);
  return { ok:true, apv: ehApvOut_(a) };
}
