// Xuất (CHỈ ĐỌC) các dòng hàng hóa trúng thầu khớp dao / chỉ khâu từ file tổng hàng hóa (tender-info botGoodsScan) ⇒ export/goods-ophth.json
import fs from 'node:fs';
const B = JSON.parse(fs.readFileSync('backends.json', 'utf8'));
const URL = B['tender-info'].url, KEY = process.env.WT_BOT_KEY;
const inc = ['dao','luoi dao','knife','keratome','slit','stab','crescent','mvr','suture','chi khau','chi phau thuat','chi tan','chi khong tan','chi tieu','chi khong tieu',
  'chi nylon','chi polyamide','chi polyamid','chi polyglactin','chi pga','chi lua','chi silk','chi polypropylene','chi polyester','nylon','polyamide','polyglactin','polyglycolic','vicryl','ethilon','prolene','mersilene'];
const brands = ['mani','alcon','surgistar','aurolab','feather','rumex','kai','microtrack','iscon','ophtechnics','shah','madhu','oasis','surgi edge','heil','sharpoint','surgical specialties','beaver','bvi','diamatrix','accutome','mstech','appasamy','ureal','madhu','ikit','geeedge','yilmaz','devine','trillium','sidapharm','cpt','usm','smi','orion','ethicon','johnson','covidien','medtronic','braun','peters','huaian','haidike','huaiyin','bear medic','lotus','kono','assut','unilene','dogsan','meril','demetech','healthium','lux','sm eng','kollsut','futura','unisur','dynek','corza'];
const post = async (b) => { for (let i = 0; i < 4; i++) { try { const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ key: KEY }, b)), redirect: 'follow' }); const t = await r.text(); try { return JSON.parse(t); } catch (e) { console.log('không phải JSON', t.slice(0, 200)); } } catch (e) { console.log(e.message); } await new Promise(r => setTimeout(r, 8000 * (i + 1))); } return { ok: false }; };
const r = await post({ action: 'botGoodsScan', inc, brands, max: 60000 });
console.log('ok', r.ok, 'scanned', r.scanned, 'pkgs', r.pkgs, 'n', r.n, 'cut', r.cut);
fs.mkdirSync('export', { recursive: true });
fs.writeFileSync('export/goods-ophth.json', JSON.stringify(r));
if (!r.ok) process.exit(1);
