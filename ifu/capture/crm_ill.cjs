/* Hình MINH HOẠ các bước cài MMH CRM (giao diện trình duyệt / màn hình chính không chụp thật được).
   Nền là ảnh chụp thật của CRM (shots/crmg, crmg_en). Chạy sau crm_guide.cjs:  NODE_PATH=$(npm root -g) node crm_ill.cjs */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', 'shots');
const ICON = 'file:///home/user/MMH-CRM/media/app/icon-192.png';
const T = { vi:{ ill:'Minh hoạ', url:'manimedicalhanoi.github.io/MMH-CRM', install:'Cài đặt ứng dụng', installQ:'Cài đặt ứng dụng?', cancel:'Huỷ', ok:'Cài đặt', menu:['Thẻ mới','Thẻ ẩn danh mới','Lịch sử','Dấu trang','Thẻ gần đây','Chia sẻ…','Tìm trong trang','Cài đặt ứng dụng','Trang web cho máy tính','Cài đặt'],
  apps:['Điện thoại','Tin nhắn','Ảnh','Cài đặt','Lịch','Máy ảnh','Thư','MMH CRM'], share:['Sao chép','Thêm vào Danh sách đọc','Thêm dấu trang','Thêm vào Mục ưa thích','Thêm vào MH chính','In'], addTitle:'Thêm vào Màn hình chính', add:'Thêm', addNote:'Một biểu tượng sẽ được thêm vào Màn hình chính để bạn có thể truy cập nhanh trang web này.' },
  en:{ ill:'Illustration', url:'manimedicalhanoi.github.io/MMH-CRM', install:'Install app', installQ:'Install app?', cancel:'Cancel', ok:'Install', menu:['New tab','New Incognito tab','History','Bookmarks','Recent tabs','Share…','Find in page','Install app','Desktop site','Settings'],
  apps:['Phone','Messages','Photos','Settings','Calendar','Camera','Mail','MMH CRM'], share:['Copy','Add to Reading List','Add Bookmark','Add to Favourites','Add to Home Screen','Print'], addTitle:'Add to Home Screen', add:'Add', addNote:'An icon will be added to your Home Screen so you can quickly access this website.' } };
const CSS = `*{box-sizing:border-box}body{margin:0;font-family:Inter,'Be Vietnam Pro',Arial,sans-serif;background:#fff}
.ph{width:390px;height:844px;position:relative;overflow:hidden;background:#fff}.bg{position:absolute;inset:0;background-size:cover;background-position:top}
.bar{position:absolute;left:0;right:0;top:0;height:92px;background:#F1F3F4;border-bottom:1px solid #DADCE0;padding:44px 12px 0;display:flex;gap:10px;align-items:center}
.addr{flex:1;height:36px;border-radius:18px;background:#fff;border:1px solid #DADCE0;font-size:13px;color:#3C4043;display:flex;align-items:center;padding:0 12px;gap:6px}
.dots{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;color:#3C4043}
.hl{outline:4px solid #FFE100;outline-offset:2px;border-radius:10px}
.dim{position:absolute;inset:0;background:rgba(0,0,0,.35)}
.menu{position:absolute;right:8px;top:86px;width:236px;background:#fff;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.25);padding:6px 0;font-size:15px;color:#202124}
.menu div{padding:11px 18px}.menu .hl{outline-offset:-4px;border-radius:8px;font-weight:600}
.dlg{position:absolute;left:28px;right:28px;top:300px;background:#fff;border-radius:22px;padding:22px;box-shadow:0 8px 30px rgba(0,0,0,.3)}
.dlg h3{margin:0 0 16px;font-size:19px;color:#202124}.app{display:flex;gap:12px;align-items:center}.app img{width:44px;height:44px;border-radius:10px}
.app b{display:block;font-size:15px}.app small{color:#5F6368;font-size:12px}.btns{display:flex;justify-content:flex-end;gap:18px;margin-top:22px;font-size:15px;font-weight:600;color:#1A73E8;align-items:center}
.btns .pri{background:#1A73E8;color:#fff;border-radius:18px;padding:9px 18px}
.home{position:absolute;inset:0;background:linear-gradient(160deg,#2B3F55,#16222E);padding:70px 26px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:26px 18px}
.ic{text-align:center;color:#fff;font-size:11px}.ic i{display:block;width:62px;height:62px;border-radius:15px;margin:0 auto 6px}.ic img{width:62px;height:62px;border-radius:15px;display:block;margin:0 auto 6px}
.tag{position:absolute;left:10px;bottom:10px;background:#003047;color:#fff;font-size:12px;font-weight:600;padding:4px 9px;border-radius:7px;opacity:.92}
.sbar{position:absolute;left:0;right:0;bottom:0;height:96px;background:#F7F7F8;border-top:1px solid #DADCE0;display:flex;flex-direction:column;align-items:center;padding-top:8px}
.surl{width:92%;height:36px;border-radius:12px;background:#E9E9EB;display:flex;align-items:center;justify-content:center;font-size:13px;color:#111}
.sic{display:flex;justify-content:space-around;width:100%;margin-top:8px;font-size:22px;color:#007AFF}.sic span{width:40px;height:34px;display:flex;align-items:center;justify-content:center}
.sheet{position:absolute;left:0;right:0;bottom:0;top:110px;background:#F2F2F7;border-radius:14px 14px 0 0;padding:16px}
.shead{background:#fff;border-radius:12px;padding:12px;display:flex;gap:10px;align-items:center;margin-bottom:14px}.shead img{width:44px;height:44px;border-radius:10px}
.slist{background:#fff;border-radius:12px;overflow:hidden}.slist div{padding:13px 14px;border-bottom:1px solid #E5E5EA;font-size:15px;display:flex;justify-content:space-between}
.slist .hl{outline-offset:-4px;font-weight:600}
.ios{position:absolute;inset:0;background:#F2F2F7;padding:54px 16px}.ihd{display:flex;justify-content:space-between;font-size:16px;color:#007AFF;margin-bottom:22px}.ihd b{color:#000}
.icard{background:#fff;border-radius:12px;padding:14px;display:flex;gap:12px}.icard img{width:58px;height:58px;border-radius:13px}.icard small{display:block;color:#8E8E93;font-size:12px;margin-top:6px}
.inote{font-size:12px;color:#8E8E93;margin:10px 4px}
.desk{width:1440px;height:900px;position:relative;overflow:hidden;background:#fff}.dbar{position:absolute;left:0;right:0;top:0;height:86px;background:#DEE1E6}
.tab{position:absolute;left:12px;top:8px;width:250px;height:34px;background:#fff;border-radius:10px 10px 0 0;font-size:13px;display:flex;align-items:center;gap:8px;padding:0 12px}.tab img{width:16px;height:16px;border-radius:3px}
.daddr{position:absolute;left:12px;right:12px;top:44px;height:36px;background:#fff;border-radius:18px;font-size:14px;color:#3C4043;display:flex;align-items:center;padding:0 16px}
.dinst{position:absolute;right:92px;top:48px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:18px}
.dshot{position:absolute;left:0;right:0;top:86px;bottom:0;background-size:cover;background-position:top left}
.dpop{position:absolute;right:40px;top:92px;width:340px;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);padding:20px}`;
const DL = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3C4043" stroke-width="1.8"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 7v6M9.5 10.5 12 13l2.5-2.5M8 21h8"/></svg>';
const SH = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#007AFF" stroke-width="1.8"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5v8a2 2 0 002 2h10a2 2 0 002-2v-8h-1"/></svg>';
async function render(b, html, out, w, h){
  const p = await b.newPage({ viewport:{ width:w, height:h }, deviceScaleFactor:2 });
  await p.setContent(`<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html}</body></html>`); await p.waitForTimeout(300);
  const png = out.replace(/\.jpg$/, '.png'); await p.screenshot({ path:png }); await p.close();
  execFileSync('python3', ['-c', `from PIL import Image\nImage.open(${JSON.stringify(png)}).convert('RGB').save(${JSON.stringify(out)},quality=84)`]); fs.unlinkSync(png);
}
(async () => {
  const b = await chromium.launch();
  for (const L of ['vi', 'en']){
    const t = T[L], dir = path.join(ROOT, L === 'en' ? 'crmg_en' : 'crmg'), png = f => 'file://' + path.join(dir, 'png', f + '.png');
    const bgM = fs.existsSync(path.join(dir, 'png', 'm_today.png')) ? png('m_today') : '', bgD = png('home');
    const addr = (extra) => `<div class="bar"><div class="addr">🔒 ${t.url}</div><div class="dots ${extra || ''}">⋮</div></div>`;
    const phone = (inner, cls) => `<div class="ph"><div class="bg" style="background-image:url('${bgM}');top:92px"></div>${inner}<div class="tag">${t.ill}</div></div>`;
    await render(b, phone(addr('hl')), path.join(dir, 'ill_and_dots.jpg'), 390, 844);
    await render(b, phone(addr() + `<div class="dim"></div><div class="menu">${t.menu.map((m, i) => `<div class="${i === 7 ? 'hl' : ''}">${m}</div>`).join('')}</div>`), path.join(dir, 'ill_and_menu.jpg'), 390, 844);
    await render(b, phone(addr() + `<div class="dim"></div><div class="dlg"><h3>${t.installQ}</h3><div class="app"><img src="${ICON}"><div><b>MMH CRM</b><small>manimedicalhanoi.github.io</small></div></div><div class="btns"><span>${t.cancel}</span><span class="pri hl">${t.ok}</span></div></div>`), path.join(dir, 'ill_and_prompt.jpg'), 390, 844);
    const cols = ['#5B8DEF','#4CAF50','#F4B400','#9E9E9E','#3F51B5','#E57373','#26A69A'];
    await render(b, `<div class="ph"><div class="home"><div class="grid">${t.apps.map((a, i) => i === 7 ? `<div class="ic"><img class="hl" src="${ICON}">${a}</div>` : `<div class="ic"><i style="background:${cols[i]}"></i>${a}</div>`).join('')}</div></div><div class="tag">${t.ill}</div></div>`, path.join(dir, 'ill_home.jpg'), 390, 844);
    await render(b, `<div class="ph"><div class="bg" style="background-image:url('${bgM}');bottom:96px"></div><div class="sbar"><div class="surl">${t.url.split('/')[0]}</div><div class="sic"><span>‹</span><span>›</span><span class="hl">${SH}</span><span>▢</span><span>⧉</span></div></div><div class="tag">${t.ill}</div></div>`, path.join(dir, 'ill_ios_share.jpg'), 390, 844);
    await render(b, `<div class="ph"><div class="bg" style="background-image:url('${bgM}')"></div><div class="dim"></div><div class="sheet"><div class="shead"><img src="${ICON}"><div><b>MMH CRM</b><br><small style="color:#8E8E93">manimedicalhanoi.github.io</small></div></div><div class="slist">${t.share.map((s, i) => `<div class="${i === 4 ? 'hl' : ''}"><span>${s}</span><span style="color:#8E8E93">${i === 4 ? '⊞' : ''}</span></div>`).join('')}</div></div><div class="tag">${t.ill}</div></div>`, path.join(dir, 'ill_ios_sheet.jpg'), 390, 844);
    await render(b, `<div class="ph"><div class="ios"><div class="ihd"><span>${t.cancel}</span><b>${t.addTitle}</b><span class="hl" style="font-weight:600;padding:0 4px">${t.add}</span></div><div class="icard"><img src="${ICON}"><div><b>MMH CRM</b><small>https://${t.url}/</small></div></div><div class="inote">${t.addNote}</div></div><div class="tag">${t.ill}</div></div>`, path.join(dir, 'ill_ios_add.jpg'), 390, 844);
    await render(b, `<div class="desk"><div class="dbar"><div class="tab"><img src="${ICON}">MMH CRM system</div><div class="daddr">${t.url}/</div><div class="dinst hl">${DL}</div></div><div class="dshot" style="background-image:url('${bgD}')"></div><div class="dpop"><h3 style="margin:0 0 14px;font-size:18px">${t.installQ}</h3><div class="app"><img src="${ICON}"><div><b>MMH CRM</b><small>manimedicalhanoi.github.io</small></div></div><div class="btns"><span class="pri hl">${t.ok}</span><span>${t.cancel}</span></div></div><div class="tag">${t.ill}</div></div>`, path.join(dir, 'ill_desk.jpg'), 1440, 900);
    console.log('✓ ' + L);
  }
  await b.close();
})();
