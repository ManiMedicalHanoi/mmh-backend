/* Xuất 1 ảnh chụp (tools/guide/shots/<tên>.png) thành JPEG cho thông báo cập nhật.
   node tools/guide/shot2jpg.js <tên> <file-ra.jpg> [x y w h (tỉ lệ 0–1)] [rộng px, mặc định 1200] */
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const [name,out,x=0,y=0,w=1,h=1,W=1200]=process.argv.slice(2);
(async()=>{
  const dir=path.join(__dirname,'shots'), j=JSON.parse(fs.readFileSync(path.join(dir,name+'.json')));
  const cw=+W, ch=Math.round(cw*(+h*j.h)/(+w*j.w)), iw=cw/(+w);
  const html=path.join(__dirname,'_v.html');
  fs.writeFileSync(html,`<body style="margin:0;overflow:hidden"><div style="width:${cw}px;height:${ch}px;overflow:hidden;position:relative"><img src="shots/${name}.png" style="position:absolute;width:${iw}px;left:${-x*iw}px;top:${-y*iw*j.h/j.w}px"></div></body>`);
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:cw,height:ch}});
  await p.goto('file://'+html); await p.waitForFunction(()=>document.images[0].complete&&document.images[0].naturalWidth>0);
  await p.screenshot({path:path.resolve(out),type:'jpeg',quality:82}); await b.close();
})();
