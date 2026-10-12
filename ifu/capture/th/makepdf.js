// Dựng file PDF bài giảng MẪU (dữ liệu giả) để trình đọc tài liệu trong Hub hiển thị thật.
const {chromium} = require('playwright');
const F = '/home/claude/ifu/capture/th/vendor/bvp/package/files/';
const face = w => ['latin', 'latin-ext', 'vietnamese'].map(s => `@font-face{font-family:BVP;font-weight:${w};src:url(file://${F}be-vietnam-pro-${s}-${w}-normal.woff2) format('woff2')}`).join('');
const css = [400, 600, 700, 800].map(face).join('') + `
@page{size:1280px 720px;margin:0}*{box-sizing:border-box}body{margin:0;font-family:BVP,sans-serif;color:#003047}
.s{width:1280px;height:720px;position:relative;overflow:hidden;page-break-after:always;background:#fff;padding:64px 80px}
.bar{position:absolute;left:0;top:0;width:100%;height:10px;background:#FFE100}.ft{position:absolute;left:80px;right:80px;bottom:34px;display:flex;justify-content:space-between;font-size:15px;color:#8A99AB}
h1{font-size:58px;margin:0 0 18px;line-height:1.15}h2{font-size:40px;margin:0 0 30px}.k{font-size:18px;letter-spacing:4px;color:#3A5CAA;font-weight:700}
.cover{background:#003047;color:#fff}.cover h1{color:#fff;margin-top:150px}.cover .k{color:#FFE100}.cover p{font-size:24px;color:#CFE2F3}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:26px}.card{border:2px solid #E6EAEF;border-radius:18px;padding:26px;min-height:300px}
.card b{display:block;font-size:26px;margin:14px 0 10px}.card p{font-size:19px;color:#3D5268;line-height:1.5;margin:0}.tag{display:inline-block;background:#F0F7FF;color:#3A5CAA;border-radius:8px;padding:4px 12px;font-size:16px;font-weight:700}
ul{font-size:26px;line-height:1.75;color:#1A2B3C;padding-left:30px}li b{color:#3A5CAA}
table{width:100%;border-collapse:collapse;font-size:21px}th{background:#003047;color:#fff;text-align:left;padding:14px 18px}td{padding:14px 18px;border-bottom:1px solid #E6EAEF}tr:nth-child(even) td{background:#F7FAFD}
.big{font-size:120px;font-weight:800;color:#3A5CAA;line-height:1}.row{display:flex;gap:40px;align-items:center}`;
const foot = n => `<div class="ft"><span>MMH Training · Mani Dental product: Key SKUs FY68 · TÀI LIỆU MẪU</span><span>${n}</span></div>`;
const S = [
 `<div class="s cover"><div class="bar"></div><div class="k">MMH TRAINING · PRODUCT</div><h1>Mani Dental product:<br>Key SKUs FY68</h1><p>Đào tạo nội bộ Sales team · Trainer: Giang (Product Team)</p>${foot(1)}</div>`,
 `<div class="s"><div class="bar"></div><div class="k">NỘI DUNG</div><h2>Chương trình buổi học</h2><ul><li><b>01</b> · Tổng quan danh mục nha khoa FY68</li><li><b>02</b> · Nhóm nội nha: trâm tay &amp; trâm máy NiTi</li><li><b>03</b> · Nhóm mũi khoan: DIA-BURS, Carbide, Surgical</li><li><b>04</b> · Vật liệu phục hồi MMG</li><li><b>05</b> · Thông điệp chính &amp; câu hỏi thường gặp</li></ul>${foot(2)}</div>`,
 `<div class="s"><div class="bar"></div><div class="k">01 · TỔNG QUAN</div><h2>3 nhóm sản phẩm chủ lực</h2><div class="grid"><div class="card"><span class="tag">Nội nha</span><b>Trâm tay &amp; trâm máy</b><p>Trâm tay inox, trâm máy NiTi JIZAI cho tạo hình ống tuỷ.</p></div><div class="card"><span class="tag">Mũi khoan</span><b>DIA-BURS · Carbide</b><p>Mũi khoan kim cương và carbide cho phục hình, phẫu thuật.</p></div><div class="card"><span class="tag">Vật liệu</span><b>Composite · Mani Bond</b><p>Vật liệu phục hồi và keo dán của MMG (Đức).</p></div></div>${foot(3)}</div>`,
 `<div class="s"><div class="bar"></div><div class="k">02 · NỘI NHA</div><h2>Trâm máy NiTi JIZAI</h2><div class="row"><div class="big">5</div><ul style="flex:1"><li>Bộ trâm cho tạo hình ống tuỷ theo trình tự</li><li>Giới thiệu theo nhu cầu của bác sĩ nội nha</li><li>Luôn kèm hướng dẫn sử dụng (IFU) bản tiếng Việt</li></ul></div>${foot(4)}</div>`,
 `<div class="s"><div class="bar"></div><div class="k">03 · MŨI KHOAN</div><h2>SKU ưu tiên theo kênh (số liệu mẫu)</h2><table><tr><th>Nhóm</th><th>Kênh chính</th><th>Mục tiêu FY68</th><th>Ghi chú</th></tr><tr><td>DIA-BURS</td><td>Phòng khám tư</td><td>Tăng độ phủ</td><td>Bộ demo theo vùng</td></tr><tr><td>Carbide burs</td><td>Bệnh viện</td><td>Duy trì</td><td>Hồ sơ thầu</td></tr><tr><td>Surgical burs</td><td>Phẫu thuật hàm mặt</td><td>Mở mới</td><td>Kèm IFU</td></tr><tr><td>IPR</td><td>Chỉnh nha</td><td>Thử nghiệm</td><td>Theo dõi phản hồi</td></tr></table>${foot(5)}</div>`,
 `<div class="s"><div class="bar"></div><div class="k">04 · VẬT LIỆU</div><h2>Vật liệu phục hồi MMG</h2><ul><li>Composite: tư vấn theo ca lâm sàng thường gặp</li><li>Mani Bond: hướng dẫn quy trình dán từng bước</li><li>Bảo quản đúng điều kiện ghi trên nhãn</li></ul>${foot(6)}</div>`,
 `<div class="s"><div class="bar"></div><div class="k">05 · THÔNG ĐIỆP</div><h2>Khi gặp bác sĩ, hãy nhớ</h2><ul><li>Lắng nghe nhu cầu trước khi giới thiệu sản phẩm</li><li>Chỉ dùng thông tin có trong tài liệu chính thức</li><li>Ghi nhận phản hồi vào <b>MMH CRM</b> ngay sau buổi gặp</li></ul>${foot(7)}</div>`,
 `<div class="s cover"><div class="bar"></div><div class="k">KẾT THÚC</div><h1>Cảm ơn!<br>Hẹn gặp ở bài kiểm tra</h1><p>Học hết tài liệu trong Training Hub → làm bài kiểm tra → nhận chứng chỉ.</p>${foot(8)}</div>`];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent(`<html><head><meta charset="utf-8"><style>${css}</style></head><body>${S.join('')}</body></html>`);
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({path: '/home/claude/ifu/capture/th/assets/deck.pdf', width: '1280px', height: '720px', printBackground: true});
  await b.close(); console.log('ok');
})();
