#!/usr/bin/env python3
# BÁO CÁO GÓI THẦU NPP CỦA MANI ĐANG THAM DỰ (28/11/2026, người dùng yêu cầu) — chạy trong workflow "Gói thầu NPP — báo cáo mở thầu / kết quả".
#  1. Gói Pending có số TBMT trong file thầu NPP (tender-hungvi / tender-icare ▸ winMap).
#  2. Hồ sơ đã tải (tender-info ▸ botTT57 hits/blob, botNpp sheet): biên bản mở thầu + bảng nhà thầu tham dự + TBMT + HSMT Chương V.
#     Thiếu ⇒ botRoute op=pkg dry=1 (đưa vào hàng đợi bot tải), lượt sau làm tiếp.
#  3. Phân tích: thông tin gói (giá, số phần lô, chọn theo phần / cả gói, nguồn vốn, hợp đồng, thời gian thực hiện), yêu cầu kỹ thuật từng lô liên quan MMH
#     (mức chi tiết, xuất xứ), mã MANI đáp ứng, nhà thầu + giá + xếp hạng từng lô, khả năng trúng, giá trị ước tính USD (tỷ giá 26.000) + phần trong FY hiện tại.
#  4. Ảnh bằng chứng cắt từ biên bản / HSMT (khung đỏ) ⇒ email (ảnh nhúng) + PDF đính kèm ⇒ botNpp op=send (stage mo).
#  5. Gói đã gửi lần 1 có kết quả ⇒ botNpp op=kq ⇒ email trả lời trong cùng luồng (stage kq): nhà thầu trúng / không trúng + lý do.
# Biến môi trường: WT_BOT_KEY · NPP_MODE = plan | dry | preview | live · NPP_NO = 1 số TBMT (tuỳ chọn) · NPP_FROM = yyyymm (mặc định 6 tháng trước)
import json, os, re, sys, base64, subprocess, unicodedata, datetime, html, time, urllib.request, csv, glob, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..'))
B = json.load(open(os.path.join(REPO, 'backends.json'), encoding='utf-8'))
URL = B['tender-info']['url']
KEY = os.environ.get('WT_BOT_KEY', '')
MODE = os.environ.get('NPP_MODE', 'plan')
ONLY = [re.sub(r'-\d+$', '', x) for x in re.split(r'[,\s]+', (os.environ.get('NPP_NO') or '').strip().upper()) if x]
TEST_TO = (os.environ.get('NPP_TEST_TO') or 'Giang').strip()
RATE = 26000
WORK = os.environ.get('NPP_WORK', '/tmp/npp')
os.makedirs(WORK, exist_ok=True)
LOG = []

def log(*a):
    s = ' '.join(str(x) for x in a); print(s, flush=True); LOG.append(s)

# ───────────── gọi máy chủ
def post(body, tries=4, timeout=330):
    data = json.dumps(dict({'key': KEY}, **body)).encode()
    for i in range(tries):
        try:
            req = urllib.request.Request(URL, data=data, headers={'Content-Type': 'application/json'})
            t = urllib.request.urlopen(req, timeout=timeout).read().decode('utf-8', 'replace')
            try: return json.loads(t)
            except Exception: log('Phản hồi không phải JSON:', t[:200])
        except Exception as e: log('Lỗi mạng:', e)
        time.sleep(5 * (i + 1))
    return {'ok': False, 'error': 'không gọi được máy chủ'}

def get_json(url, timeout=120):
    for i in range(3):
        try: return json.loads(urllib.request.urlopen(url, timeout=timeout).read().decode('utf-8', 'replace'))
        except Exception as e: log('Lỗi đọc', url[:60], e); time.sleep(5)
    return {}

# ───────────── chữ
def nk(s):
    s = unicodedata.normalize('NFD', str(s or '').lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').replace('đ', 'd')
    return re.sub(r'[^a-z0-9.]+', ' ', s).strip()
def bare_(no): return re.sub(r'-\d+$', '', re.sub(r'\s+', '', str(no or '').upper()))
def bare(no): return re.sub(r'-\d+$', '', re.sub(r'\s+', '', str(no or '').upper()))
def num(s):
    s = str(s or '').strip()
    if not s or s in ('-',): return 0
    s = re.sub(r'[^\d,.]', '', s)
    if re.search(r'\d\.\d{3}(\.|$)', s) or (',' in s and '.' in s and s.rfind('.') < s.rfind(',')): s = s.replace('.', '').replace(',', '.')
    else: s = s.replace(',', '')
    try: return float(s)
    except Exception: return 0
def vnd(v): return f"{round(v):,}".replace(',', '.')
def tr(v): return (f"{v/1e6:,.1f}".replace(',', 'X').replace('.', ',').replace('X', '.')) + ' tr đ'
def usd(v): return '$' + f"{v/RATE:,.0f}"
def H(s): return html.escape(str(s or ''))
def pct(a, b): return (f"{(a/b-1)*100:+.1f}%".replace('.', ',')) if b else ''

# ───────────── dữ liệu MANI (giá MANI → NPP, giá NPP → BV, catalogue chỉ khâu)
def load_prices():
    s = open(os.path.join(REPO, 'backends/crm-surgical/MMH_Prices.gs'), encoding='utf-8').read()
    P = {}
    for code, kind, pack, box, unit, name in re.findall(r'\["([^"]+)", "(dao|chi|ghim)", (\d+), (\d+), (\d+), "([^"]*)"', s):
        P[code.upper()] = {'code': code, 'kind': kind, 'unit': int(unit), 'name': name}
    return P
def load_hosp():
    s = open(os.path.join(REPO, 'backends/crm-surgical/MMH_HospPrices.gs'), encoding='utf-8').read()
    P = {}
    for code, kind, pack, mx, pub, pri in re.findall(r'\["([^"]+)", "(dao|chi|ghim)", (\d+), (\d+), (\d+), (\d+)', s):
        P[code.upper()] = {'max': int(mx) / int(pack), 'pub': int(pub) / int(pack)}
    return P
PRICE, HOSP = load_prices(), load_hosp()
SUT = list(csv.DictReader(open(os.path.join(ROOT, 'data/mani_sutures.csv'), encoding='utf-8-sig')))

MAT = [('polypropylene', ['polypropylene', 'prolene']), ('nylon', ['nylon', 'polyamide', 'polyamid']), ('pga', ['polyglactin', 'polyglycolic', 'pga', 'vicryl', 'axit polyglycolic']),
       ('polyester', ['polyester']), ('silk', ['silk', 'lua tu nhien', 'chi lua'])]
def lot_type(name):
    t = nk(name)
    if re.search(r'\bdao\b|knife|keratome|\bmvr\b|crescent', t): return 'dao'
    if re.search(r'\bchi (khau|phau thuat|khong tieu|tieu|nylon|polypro|pga|polyglact|polyester|lua|silk)|\bsuture', t): return 'chi'
    if re.search(r'ghim (da|khau)|dap ghim|manipler|skin stapler', t): return 'ghim'
    if re.search(r'(kim|kep|panh) (vi phau|boc mang)|micro ?forcep', t): return 'kim'
    if re.search(r'moc mo (vung )?be|trabecul', t): return 'moc'
    return ''

GROUP = {'dao': 'Dao phẫu thuật nhãn khoa', 'chi': 'Chỉ khâu nhãn khoa', 'ghim': 'Ghim da (Manipler)', 'kim': 'Kìm vi phẫu', 'moc': 'Móc mở vùng bè'}
GORDER = list(GROUP.values()) + ['Khác']

def why_not(l):
    """phần NPP không dự ⇒ lý do theo số liệu (không khẳng định thay NPP)"""
    if not l['codes']: return 'MANI không có mã khớp thông số HSMT' if l.get('spec') else 'Chưa xác định được mã MANI (HSMT chưa đọc được thông số)'
    pubs = [HOSP[c.upper()]['pub'] for c in l['codes'] if c.upper() in HOSP]
    if not pubs: return 'Chưa có giá tối thiểu BV công của các mã này'
    mn = min(pubs); u = l.get('unit') or 'cái'
    if not l.get('qty') or not l['bids']: return f'Giá tối thiểu BV công của MANI từ {vnd(mn)} đ/{u}; HSMT chưa đọc được số lượng để so với giá đối thủ'
    low = l['bids'][0]['price'] / l['qty']
    if low < mn: return f'Giá thấp nhất của đối thủ {vnd(low)} đ/{u} thấp hơn giá tối thiểu BV công của MANI {vnd(mn)} đ/{u} ({pct(low, mn)}) ⇒ nhiều khả năng NPP không dự vì giá không phù hợp'
    return f'Giá thấp nhất của đối thủ {vnd(low)} đ/{u} cao hơn giá tối thiểu BV công của MANI {vnd(mn)} đ/{u} ({pct(low, mn)}) ⇒ MANI có thể cạnh tranh về giá, cần hỏi NPP lý do không dự'

def code_cell(l):
    cs = list(dict.fromkeys([c.upper() for c in l['codes']] + [c for c in l.get('npp_codes', []) if c]))
    out = []
    for c in cs:
        hp = HOSP.get(c); pr = PRICE.get(c); star = c in l.get('npp_codes', [])
        t = (f'<b>{H(c)} ★ NPP chào</b>' if star else H(c)) + ' · tối thiểu BV công ' + (vnd(hp['pub']) + ' đ' if hp else 'chưa có') + ' · MANI→NPP ' + (vnd(pr['unit']) + ' đ' if pr else 'chưa có')
        out.append(t)
    return '<br>'.join(out) or '—'

def status_cell(l):
    if l['mine'] < 0: return '<span class="no">NPP không dự</span><br><span class="m">' + H(why_not(l)) + '</span>'
    bid = l['bids'][l['mine']]['price']; u = l.get('unit') or 'cái'
    t = '<span class="ok">NPP dự</span>'
    if l.get('qty'):
        unit = bid / l['qty']; t += f' · chào {vnd(unit)} đ/{u}'
        pubs = [HOSP[c]['pub'] for c in l.get('npp_codes', []) if c in HOSP]
        if len(pubs) == 1: t += f' (giá tối thiểu BV công {vnd(pubs[0])} đ: {pct(unit, pubs[0])})'
    return t

def eye_rel(lt, name, inv=''):
    """lô NPP không dự: chỉ giữ hàng nhãn khoa / vi phẫu MANI có"""
    t = nk(name); raw = str(name)
    if re.search(r'sieu am|lang da|dien|cat dot|laser|thep|titan|kim loai|ghim khau mo|stapler noi soi|tam giac', t): return False
    if 'mat' in nk(inv).split() and lt in ('dao', 'chi'): return True   # bệnh viện mắt ⇒ mọi dao / chỉ
    if lt == 'dao': return bool(re.search(r'\bmat\b|phaco|\bmong\b|nhan khoa|mvr|luoi liem|crescent|slit|giac mac|cung mac|chich|15 do|1[05] do|2[.,]\d|3[.,]\d', t))
    if lt == 'chi':
        sz = re.findall(r'\b(\d{1,2})\s?[-/]\s?0\b', raw)
        return bool(re.search(r'\bmat\b|nhan khoa|spatula|hinh thang|giac mac', t)) or any(int(x) >= 7 for x in sz)
    return lt in ('ghim', 'kim', 'moc')

def mani_codes(ltype, text):
    """mã MANI có thể đáp ứng lô (tối đa 4) theo tên + thông số"""
    t = nk(text); out = []
    if ltype == 'chi':
        mat = next((m for m, ws in MAT if any(w in t for w in ws)), '')
        sz = re.search(r'\b(\d{1,2})\s?[-/]\s?0\b', str(text))
        size = (sz.group(1) + '-0') if sz else ''
        dbl = bool(re.search(r'\b2 kim|hai kim|double', t))
        if not mat or not size: return []
        nd = 'thang' if re.search(r'kim thang|straight', t) else 'spatula' if re.search(r'spatula|hinh thang', t) else 'tron' if re.search(r'kim tron|taper', t) else ''
        for r in SUT:
            if mat and nk(r['Suture (EN)']).find({'pga': 'pga', 'silk': 'silk'}.get(mat, mat)) < 0: continue
            if size and r['Cỡ chỉ (USP)'].split(' ')[0] != size: continue
            if dbl and r['Một đầu kim (Single-armed)'] == 'Có': continue
            ne = nk(r['Needle (EN)'] + ' ' + r['Độ cong'])
            if nd == 'thang' and 'kim thang' not in nk(r['Độ cong']) and 'straight' not in ne: continue
            if nd == 'spatula' and 'spatula' not in ne: continue
            if nd == 'tron' and 'taper' not in ne: continue
            out.append(r['Mã đặt hàng'])
        return out[:4]
    if ltype == 'dao':
        fam = []
        m = re.search(r'\b(1[05]|22|30|45)\s?(do|°)', t) or re.search(r'(1[05]|22,5|22.5|30|45)\s?(do|°)', text.lower())
        if 'luoi liem' in t or 'crescent' in t or 'mong' in t: fam = ['MCU26', 'MCU26SH', 'MCU20']
        elif re.search(r'\bmvr|\b2[035] ?g\b', t):
            g = re.search(r'\b(19|20|23|25) ?g\b', t); fam = ['MVR' + (g.group(1) if g else '20'), 'MVR23']
        elif m and re.search(r'thang|15 do|phaco|chich', t):
            a = m.group(1).replace(',', '.').split('.')[0]; fam = ['MST' + a, 'MST' + a + 'MK', 'MST' + a + 'SK']
        else:
            mm = re.search(r'\b(\d)[.,](\d{1,2})\s?mm', t) or re.search(r'\b(\d)[.,](\d{1,2})\b', t)
            if mm:
                d = mm.group(1) + (mm.group(2) + '0')[:1] if mm.group(2) not in ('75', '65') else mm.group(1) + {'75': '7', '65': '6'}[mm.group(2)]
                fam = ['MSL' + d, 'MSL' + d + 'SH', 'MSL' + d + 'SK']
        return [c for c in fam if c in PRICE][:4]
    if ltype == 'ghim': return [c for c in ('AZ35WS', 'DS35WS') if c in PRICE]
    return []

# ───────────── NPP: gói Pending
def month_back(n):
    d = datetime.date.today(); y, m = d.year, d.month - n
    while m <= 0: m += 12; y -= 1
    return y * 100 + m
NPPRE = {'Hùng Vĩ': r'hung vi', 'iCare': r'\bi ?-? ?care\b'}
def load_npp():
    frm = os.environ.get('NPP_FROM') or str(month_back(8))
    out = {}
    for key, npp in (('tender-hungvi', 'Hùng Vĩ'), ('tender-icare', 'iCare')):
        j = get_json(B[key]['url'] + '?action=winMap&from=' + frm)
        rows = j.get('rows') or []
        log(f'{npp}: {len(rows)} dòng thầu từ {frm}')
        for r in rows:
            no = bare(r.get('tbmt'))
            if not re.match(r'^IB\d{8,12}$', no): continue
            res = str(r.get('result') or '').lower()
            P = out.setdefault(no, {'no': no, 'npp': npp, 'hospital': r.get('hospital') or '', 'city': r.get('city') or '', 'tender': r.get('tender') or '', 'items': [], 'pending': False, 'dur': r.get('dur')})
            if not res or res.startswith('pend'): P['pending'] = True
            P['items'].append({'code': str(r.get('pcode') or '').strip(), 'qty': num(r.get('qty')), 'price': num(r.get('price')), 'unit': r.get('unit') or ''})
    return {k: v for k, v in out.items() if v['pending']}

# ───────────── hồ sơ đã tải
def load_hits(want):
    H, off = {}, 0
    while True:
        r = post({'action': 'botTT57', 'op': 'hits', 'off': off, 'n': 3000})
        if not r.get('ok'): log('Lỗi đọc danh sách gói:', r.get('error')); break
        for h in r['hits']:
            b = bare(h['no'])
            if b in want: H.setdefault(b, []).append(h)
        if not r.get('next'): break
        off = r['next']
    return H

def pick(files, *pats, ext=None):
    for p in pats:
        for f in files:
            s = (f.get('kind', '') + ' ' + f.get('name', ''))
            if re.search(p, s, re.I) and (not ext or re.search(ext, f.get('name', ''), re.I)): return f
    return None

def blob(f, d):
    if not f: return None
    r = post({'action': 'botTT57', 'op': 'blob', 'id': f['id'], 'maxMb': 25})
    if not r.get('ok') or not r.get('b64'): log('  không tải được', f.get('name'), r.get('error') or r.get('skip')); return None
    name = re.sub(r'[\\/:*?"<>|]', ' ', r.get('name') or f['name'])
    p = os.path.join(d, name); open(p, 'wb').write(base64.b64decode(r['b64']))
    if re.search(r'\.(docx?|rtf|odt|xlsx?)$', p, re.I) or 'google-apps.document' in (r.get('mime') or ''):
        if not p.lower().endswith('.pdf') and 'google-apps.document' not in (r.get('mime') or ''):
            subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', d, p], capture_output=True, timeout=240)
            q = os.path.splitext(p)[0] + '.pdf'
            return q if os.path.exists(q) else None
        if 'google-apps.document' in (r.get('mime') or ''): q = os.path.splitext(p)[0] + '.pdf'; os.rename(p, q); return q
    return p

def pdftext(p):
    try: return subprocess.run(['pdftotext', '-layout', p, '-'], capture_output=True, text=True, timeout=120).stdout
    except Exception: return ''

# ───────────── bảng nhà thầu tham dự (Google Sheet) ⇒ lô
def read_bidders(f):
    if not f: return []
    r = post({'action': 'botNpp', 'op': 'sheet', 'id': f['id']})
    if not r.get('ok'): log('  không đọc được bảng nhà thầu:', r.get('error')); return []
    V = r['sheets'][0]['values']
    hr = next((i for i, row in enumerate(V[:15]) if any('Tên nhà thầu' in c for c in row) and any('Giá dự thầu' in c for c in row)), -1)
    if hr < 0: return []
    h = V[hr]
    def col(*ks, no=None):
        for i, c in enumerate(h):
            if any(k in c for k in ks) and not (no and no in c): return i
        return -1
    cC, cN, cB, cBid, cAfter = col('Mã phần'), col('Tên phần'), col('Tên nhà thầu'), col('Giá dự thầu', no='sau'), col('sau giảm')
    lots, cur = [], None
    for row in V[hr + 1:]:
        g = lambda j: row[j].strip() if 0 <= j < len(row) else ''
        if g(cC):
            cur = {'code': g(cC), 'name': g(cN), 'bids': []}; lots.append(cur)
        if cur is not None and g(cB):
            p = num(g(cAfter)) or num(g(cBid))
            cur['bids'].append({'name': g(cB), 'price': p})
    for l in lots: l['bids'].sort(key=lambda x: x['price'] or 9e18)
    return lots

# ───────────── ảnh bằng chứng (cắt PDF, khung đỏ)
WRE = re.compile(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>')
def words(pdf):
    t = subprocess.run(['pdftotext', '-bbox', pdf, '-'], capture_output=True, text=True, timeout=180).stdout
    return [[(float(a), float(b), float(c), float(d), html.unescape(w)) for a, b, c, d, w in WRE.findall(pg)] for pg in t.split('<page ')[1:]]
def render(pdf, p, out, dpi=150):
    if not os.path.exists(out + '.png'):
        subprocess.run(['pdftoppm', '-f', str(p), '-l', str(p), '-r', str(dpi), '-png', '-singlefile', pdf, out], check=True)
    from PIL import Image
    return Image.open(out + '.png').convert('RGB')

def minutes_index(pdf):
    P = words(pdf); lots, vns = [], []
    for pi, ws in enumerate(P, 1):
        ws = sorted(ws, key=lambda w: (round(w[1]), w[0]))
        col = [w for w in ws if w[0] < 80]; i = 0
        while i < len(col):
            if re.match(r'^PP\d\d$', col[i][4]) and i + 2 < len(col): lots.append({'code': col[i][4] + col[i+1][4] + col[i+2][4], 'p': pi, 'y': col[i][1] - 4}); i += 3
            else: i += 1
        for w in ws:
            if re.match(r'^vn\w{2,}$', w[4]) and 120 < w[0] < 200: vns.append((pi, w[1] - 3))
    return P, lots, sorted(set(vns))

def segs(P, a, b):
    out = []; (p0, y0), (p1, y1) = a, b
    for p in range(p0, p1 + 1):
        ft = [w[1] for w in P[p-1] if w[4] == 'Tài' and w[1] > 700]
        top = y0 if p == p0 else 36; bot = y1 if p == p1 else (min(ft) - 6 if ft else 800)
        if p == p1 and ft: bot = min(bot, min(ft) - 6)
        if bot - top > 6: out.append((p, top, bot))
    return out

def crop_lot(pdf, idx, code, out, mark):
    from PIL import Image, ImageDraw
    P, lots, vns = idx; K = 150 / 72
    L = [l for l in lots if l['code'] == code]
    if not L: return None
    l = L[0]; j = lots.index(l)
    end = (lots[j+1]['p'], lots[j+1]['y']) if j + 1 < len(lots) else (len(P), 800)
    S = segs(P, (l['p'], l['y']), end)
    rows = [v for v in vns if (l['p'], l['y']) <= v < end]; hits = []
    for k, v in enumerate(rows):
        nx = rows[k+1] if k + 1 < len(rows) else end
        txt = ' '.join(w[4] for p, y0, y1 in segs(P, v, nx) for w in P[p-1] if y0 <= w[1] < y1 and 180 < w[0] < 330)
        if re.search(mark, nk(txt)): hits.append((v, nx))
    ims = []
    for p, y0, y1 in S:
        im = render(pdf, p, os.path.join(os.path.dirname(out), f'_bb{p}'))
        c = im.crop((int(30*K), int(y0*K), int(580*K), int(y1*K))).copy(); d = ImageDraw.Draw(c)
        for a, b in hits:
            for pp, ya, yb in segs(P, a, b):
                if pp == p:
                    ya, yb = max(ya, y0), min(yb, y1)
                    if yb > ya: d.rectangle([int(118*K), int((ya-y0)*K), int(547*K), int((yb-y0)*K)], outline=(214, 40, 40), width=4)
        ims.append(c)
    if not ims: return None
    Hh = sum(i.height for i in ims) + 8 * (len(ims) - 1); img = Image.new('RGB', (ims[0].width, Hh), 'white'); y = 0
    for i in ims: img.paste(i, (0, y)); y += i.height + 8
    img.save(out, quality=84); return out

def crop_band(pdf, P, p, y0, y1, out, box=True):
    from PIL import ImageDraw
    K = 150 / 72
    im = render(pdf, p, os.path.join(os.path.dirname(out), '_h%d_%s' % (p, os.path.basename(pdf)[:8])))
    x0 = max(0, min(w[0] for w in P[p-1]) - 8) if P[p-1] else 30
    x1 = min(im.width / K, max(w[2] for w in P[p-1]) + 8) if P[p-1] else 565
    c = im.crop((int(x0*K), int(max(0, y0-2)*K), int(x1*K), int(min(im.height/K, y1+2)*K))).copy()
    if box: ImageDraw.Draw(c).rectangle([2, 2, c.width-3, c.height-3], outline=(214, 40, 40), width=4)
    if c.width > 1300: c = c.resize((1300, int(c.height * 1300 / c.width)))
    c.save(out, quality=84); return out

def hlines(pdf, p, d):
    """đường kẻ ngang của bảng trên trang p (đơn vị pt)"""
    import numpy as np
    im = render(pdf, p, os.path.join(d, '_hl%d_%s' % (p, os.path.basename(pdf)[:6])))
    a = np.asarray(im.convert('L')) < 140; K = 150 / 72
    fr = a.mean(axis=1); ys = []
    for y, v in enumerate(fr):
        if v > 0.35 and (not ys or y - ys[-1] > 3): ys.append(y)
    return [y / K for y in ys]

_HL = {}
def spec_find(P, lot_name, pdf=None, d=None):
    """dòng yêu cầu kỹ thuật của 1 lô trong HSMT ⇒ (trang, y0, y1, chữ). Có PDF ⇒ chia trang theo đường kẻ ngang của bảng, chấm điểm từng dòng bảng."""
    raw = str(lot_name); size = re.findall(r'\b(\d{1,2})\s?[-/]\s?0\b', raw)
    toks = [t for t in nk(re.sub(r'\b\d{1,2}\s?[-/]\s?0\b', ' ', raw)).split() if len(t) > 1 and t not in ('so', 'cac', 'loai', 'va', 'cho', 'hoac')]
    if not toks: return None
    mats = [m for m, ws in MAT if any(w in nk(raw) for w in ws)]
    def score(txt):
        T = set(nk(txt).split()); sc = sum(1 for t in toks if t in T) / len(toks)
        sz = re.findall(r'\b(\d{1,2})\s?[-/]\s?0\b', txt)
        if size: sc += 0.5 if size[0] in sz else -0.5 if sz else 0
        if mats:
            tm = [m for m, ws in MAT if any(w in nk(txt) for w in ws)]
            if tm and mats[0] not in tm: sc -= 0.6
        return sc
    best = None
    for pi, ws in enumerate(P, 1):
        if not ws: continue
        pageT = set(nk(' '.join(w[4] for w in ws)).split())
        if sum(1 for t in toks if t in pageT) / len(toks) < 0.75: continue
        bands = []
        if pdf:
            try:
                key = (pdf, pi)
                if key not in _HL: _HL[key] = hlines(pdf, pi, d)
                L = _HL[key]; bands = [(a, b) for a, b in zip(L, L[1:]) if 12 < b - a < 420]
            except Exception as e: log('  hlines:', e)
        if not bands:   # không có đường kẻ ⇒ khung 10 dòng chữ
            lines = sorted(set(round(w[1] / 3) * 3 for w in ws))
            bands = [(y - 2, y + 90) for y in lines]
        for bi, (a, b) in enumerate(bands):
            txt = ' '.join(w[4] for w in sorted([w for w in ws if a - 1 <= w[1] < b], key=lambda w: (round(w[1]), w[0])))
            if bi == len(bands) - 1 and pi < len(P) and P[pi]:   # dòng bảng bị ngắt sang trang sau ⇒ ghép phần đầu trang kế
                try:
                    k2 = (pdf, pi + 1)
                    if pdf and k2 not in _HL: _HL[k2] = hlines(pdf, pi + 1, d)
                    L2 = _HL.get(k2) or []
                    cut = next((y for y in L2 if y > 50), 120)
                    txt += ' ' + ' '.join(w[4] for w in sorted([w for w in P[pi] if w[1] < cut], key=lambda w: (round(w[1]), w[0])))
                except Exception: pass
            sc = score(txt) - (b - a) / 4000
            if sc >= 0.75 and (not best or sc > best[0] + 1e-9): best = (sc, pi, a, b, txt)
    if not best: return None
    return best[1], best[2], best[3], best[4]

ORIGIN = [(r'\bg7\b', 'G7'), (r'\beu\b|chau au|lien minh chau au', 'EU / châu Âu'), (r'\bfda\b|hoa ky|\bmy\b', 'FDA / Mỹ'), (r'nhat ban|japan', 'Nhật Bản'),
          (r'\bce\b', 'CE'), (r'iso ?13485', 'ISO 13485'), (r'nhom 1\b|nhom 2\b', 'phân nhóm tiêu chí kỹ thuật')]
def spec_level(txt):
    t = nk(txt)
    dims = len(re.findall(r'\d+(?:[.,]\d+)?\s?(mm|cm|do|g\b|micron|um|vong)', t)); crit = len(re.split(r';|\n| - ', txt))
    if dims >= 3 or crit >= 8: return 'Chi tiết (nhiều thông số đo cụ thể)'
    if dims >= 1 or crit >= 4: return 'Trung bình (có vài thông số cụ thể)'
    return 'Chung (mô tả tổng quát)'
def origin_of(txt):
    t = nk(txt); return [lab for rx, lab in ORIGIN if re.search(rx, t)]

def field(text, label, labels):
    t = re.sub(r'[ \t]+', ' ', text)
    m = re.search(re.escape(label) + r'\s*:?\s*(.+)', t)
    if not m: return ''
    v = m.group(1)
    cut = len(v)
    for l in labels:
        if l == label: continue
        k = v.find(l)
        if 0 <= k < cut: cut = k
    return re.sub(r'\s+', ' ', v[:cut]).strip(' ,;:')[:160]
TBL = ['Mã TBMT', 'Ngày đăng tải', 'Phiên bản thay đổi', 'Mã KHLCNT', 'Phân loại KHLCNT', 'Tên dự toán mua sắm', 'Tên gói thầu', 'Mã gói thầu', 'Chủ đầu tư', 'Nguồn vốn', 'Lĩnh vực',
       'Hình thức lựa chọn nhà thầu', 'Loại hợp đồng', 'Trong nước/ Quốc tế', 'Phương thức lựa chọn nhà thầu', 'Thời gian thực hiện gói thầu', 'Gói thầu có nhiều phần/lô', 'Số lượng phần (lô)',
       'Cách thức dự thầu', 'Hình thức dự thầu', 'Địa điểm phát hành', 'Chi phí nộp', 'Địa điểm nhận', 'Địa điểm thực hiện gói thầu', 'Thông tin dự thầu', 'Thời điểm đóng thầu', 'Thời điểm mở thầu',
       'Địa điểm mở thầu', 'Hiệu lực hồ sơ dự thầu', 'Số tiền đảm bảo dự thầu', 'Hình thức đảm bảo dự thầu', 'Thông tin quyết định', 'Số quyết định phê duyệt', 'Ngày phê duyệt', 'Cơ quan ban hành',
       'Quyết định phê duyệt', 'Tài liệu được in', 'Giá gói thầu', 'Số lượng nhà thầu', 'Thời điểm hoàn thành mở thầu', 'Thông tin gói thầu', 'Thông tin nhà thầu', 'Tên kế hoạch LCNT', 'Tên chủ đầu tư']

def months(s, default=12):
    t = nk(s); m = re.search(r'(\d+)\s*thang', t)
    if m: return int(m.group(1))
    m = re.search(r'(\d+)\s*ngay', t)
    if m: return max(1, round(int(m.group(1)) / 30))
    return default
def fy_split(value, start, dur):
    """giá trị phân bổ đều theo tháng của hợp đồng ⇒ (FY hiện tại, số tháng, FY kế, phần FY kế)"""
    m, y = start.month, start.year
    fy = (y if m >= 9 else y - 1) - 1958
    rem = (8 - m) % 12 + 1
    cur = value * min(dur, rem) / dur
    nxt = value * min(max(dur - rem, 0), 12) / dur
    return fy, rem, cur, fy + 1, nxt
def add_month(d, n=1):
    m = d.month - 1 + n; return datetime.date(d.year + m // 12, m % 12 + 1, 1)
def dparse(s):
    m = re.search(r'(\d{2})/(\d{2})/(\d{4})', str(s or ''))
    if m: return datetime.date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', str(s or ''))
    return datetime.date(int(m.group(1)), int(m.group(2)), int(m.group(3))) if m else None

# ───────────── trình bày
CSS = """body{font-family:Aptos,Calibri,Arial,sans-serif;font-size:14px;color:#1F2A33;line-height:1.5}
h3{font-size:14.5px;color:#2C4A5E;margin:18px 0 6px;text-transform:uppercase}
table.t{border-collapse:collapse;margin:4px 0 8px}table.t td,table.t th{border:1px solid #C9D6E2;padding:4px 7px;font-size:13px;vertical-align:top;text-align:left}
table.t th{background:#EEF3F8;color:#2C4A5E}td.r{text-align:right;white-space:nowrap}tr.me td{background:#FFF4D6}
.ok{color:#1E6B34;font-weight:bold}.no{color:#9A2B2B;font-weight:bold}.m{color:#6B7785;font-size:12.5px}
img.ev{max-width:100%;border:1px solid #C9D6E2;margin:4px 0 2px}a{color:#2F6FB0}"""
def tbl(head, rows, me=None):
    def cell(c):
        if isinstance(c, (int, float)): return f'<td class="r">{vnd(c)}</td>'
        c = str(c)
        raw = c if (c.startswith('<') or re.search(r'<(br|span|b|a)\b', c)) else H(c)
        right = bool(re.match(r'^[\d.$,+%\- ]+(tr đ| đ)?$', c))
        return f'<td{" class=r" if right else ""}>{raw}</td>'
    h = ''.join(f'<th>{H(c)}</th>' for c in head)
    b = ''.join('<tr%s>%s</tr>' % (' class="me"' if me and me(r) else '', ''.join(cell(c) for c in r)) for r in rows)
    return f'<table class="t"><tr>{h}</tr>{b}</table>'

def build_mo(pk, hits):
    d = os.path.join(WORK, pk['no']); os.makedirs(d, exist_ok=True)
    files = [f for h in hits for f in h.get('files', []) if f.get('id')]
    I = {}
    for h in hits: I.update({k: v for k, v in h.items() if v and k in ('url', 'prov', 'price', 'close', 'open', 'form', 'inv', 'name')})
    f_bb = pick(files, r'biên bản mở thầu', ext=r'\.pdf$'); f_nt = pick(files, r'nhà thầu tham dự')
    if not f_bb or not f_nt: return None, 'chưa có biên bản mở thầu'
    f_tb = pick(files, r'thông báo mời thầu', ext=r'\.pdf$')
    f_ky = pick(files, r'yêu cầu về kỹ thuật|chương v\b|chuong v|yeu cau ky thuat')
    f_dg = pick(files, r'tiêu chuẩn đánh giá|mục 3|muc 3')
    p_bb, p_tb = blob(f_bb, d), blob(f_tb, d)
    p_ky = blob(f_ky, d) if f_ky else None
    lots = read_bidders(f_nt)
    if not lots: return None, 'không đọc được bảng nhà thầu tham dự'
    T = (pdftext(p_tb) if p_tb else '') + '\n' + (pdftext(p_bb) if p_bb else '')
    F = {k: field(T, k, TBL) for k in ('Tên gói thầu', 'Chủ đầu tư', 'Tên chủ đầu tư', 'Nguồn vốn', 'Hình thức lựa chọn nhà thầu', 'Phương thức lựa chọn nhà thầu', 'Loại hợp đồng',
                                         'Thời gian thực hiện gói thầu', 'Gói thầu có nhiều phần/lô', 'Số lượng phần (lô)', 'Hình thức dự thầu', 'Thời điểm đóng thầu', 'Giá gói thầu',
                                         'Số tiền đảm bảo dự thầu', 'Hiệu lực hồ sơ dự thầu', 'Số lượng nhà thầu', 'Thời điểm hoàn thành mở thầu', 'Số quyết định phê duyệt')}
    name = F['Tên gói thầu'] or pk['tender'] or I.get('name', '')
    inv = F['Chủ đầu tư'] or F['Tên chủ đầu tư'] or pk['hospital']
    price = num(F['Giá gói thầu']) or num(I.get('price'))
    dur = months(F['Thời gian thực hiện gói thầu'] or str(pk.get('dur') or ''), 12)
    opened = dparse(F['Thời điểm hoàn thành mở thầu'] or F['Thời điểm đóng thầu'] or I.get('close')) or datetime.date.today()
    multi = re.search(r'\bco\b', nk(F['Gói thầu có nhiều phần/lô'])) or len(lots) > 1
    ktxt = pdftext(p_ky) if p_ky else ''
    byPart = multi or re.search(r'tung phan|tung lo|theo phan', nk(ktxt))
    npre = NPPRE[pk['npp']]
    # lô liên quan: NPP tham dự + lô thuộc nhóm sản phẩm MMH
    rel = []
    for l in lots:
        mine = [i for i, b in enumerate(l['bids']) if re.search(npre, nk(b['name']))]
        lt = lot_type(l['name'])
        if mine or (lt and eye_rel(lt, l['name'], inv)): rel.append(dict(l, mine=mine[0] if mine else -1, lt=lt))
    # mã NPP chào: SL × đơn giá trong file NPP = giá dự thầu của lô
    used = set()
    for l in rel:
        if l['mine'] < 0: continue
        bid = l['bids'][l['mine']]['price']
        for k, it in enumerate(pk['items']):
            if k in used or not it['qty']: continue
            if abs(it['qty'] * it['price'] - bid) <= max(1000, bid * 0.005): l['item'] = it; used.add(k); break
    kind_of = lambda c: 'dao' if (PRICE.get(c.upper(), {}).get('kind') == 'dao' or re.match(r'^M[A-Z]{2}\d', c.upper())) else 'ghim' if PRICE.get(c.upper(), {}).get('kind') == 'ghim' else 'chi' if re.match(r'^\d{3,4}[A-Z]?$', c.upper()) else ''
    for lt in ('chi', 'dao', 'ghim'):
        un = [l for l in rel if l['mine'] >= 0 and not l.get('item') and (l['lt'] or lot_type(l['name'])) == lt]
        left = [it for k, it in enumerate(pk['items']) if k not in used and kind_of(it['code']) == lt]
        if len(un) == 1 and left: un[0]['items'] = left
    # HSMT ⇒ thông số từng lô
    KP = words(p_ky) if p_ky else []
    allorig = origin_of(ktxt)
    ev = []   # (cid, file, chú thích)
    if p_bb:
        idx = minutes_index(p_bb)
        for l in [x for x in rel if x['mine'] >= 0][:12]:
            o = crop_lot(p_bb, idx, l['code'], os.path.join(d, 'bb_%s.jpg' % l['code']), npre)
            if o: ev.append(('bb%s' % l['code'], o, 'Biên bản mở thầu · %s · %s' % (l['code'], l['name'][:90])))
    for l in rel:
        sp = spec_find(KP, l['name'], p_ky, d) if KP else None
        l['spec'] = sp[3][:600] if sp else ''
        l['level'] = spec_level(sp[3]) if sp else 'Chưa đọc được trong HSMT'
        l['orig'] = origin_of(sp[3]) if sp else []
        l['codes'] = mani_codes(l['lt'] or lot_type(l['name']), l['name'] + ' ' + re.sub(r'(?i)polypropylene|nylon|polyglactin|polyglycolic|polyester|\b\d{1,2}\s?[-/]\s?0\b', '', l['spec']))
        q = re.findall(r'\b(Sợi|Cái|Chiếc|Hộp|Vỉ|Bộ|Cây|Tép|Gói|Tuýp)\s+(\d[\d.,]*)\b', sp[3]) if sp else []
        l['unit'] = q[-1][0].lower() if q else ''; l['qty'] = num(q[-1][1]) if q else 0
        its = [l['item']] if l.get('item') else l.get('items') or []
        l['npp_codes'] = [str(it.get('code') or '').upper().split(' ')[0] for it in its if it.get('code')]
        if not l['qty'] and len(its) == 1: l['qty'] = its[0].get('qty') or 0
        if not l['unit']: l['unit'] = 'sợi' if (l['lt'] or lot_type(l['name'])) == 'chi' else 'cái'
        l['group'] = GROUP.get(l['lt'] or lot_type(l['name']), 'Khác')
        if sp and len([e for e in ev if e[0].startswith('ky')]) < 16:
            o = crop_band(p_ky, KP, sp[0], sp[1], sp[2], os.path.join(d, 'ky_%s.jpg' % l['code']))
            ev.append(('ky%s' % l['code'], o, 'HSMT · yêu cầu kỹ thuật · %s%s' % (l['name'][:90], '' if l['mine'] >= 0 else ' (NPP không dự)')))
    # biên bản: phần MMH đáp ứng được mà NPP không dự ⇒ khung đỏ = nhà thầu giá thấp nhất
    if p_bb:
        for l in [x for x in rel if x['mine'] < 0 and x['bids']][:10]:
            o = crop_lot(p_bb, idx, l['code'], os.path.join(d, 'bbx_%s.jpg' % l['code']), re.escape(nk(l['bids'][0]['name'])[:40]))
            if o: ev.append(('bx%s' % l['code'], o, 'Biên bản mở thầu · %s · %s (NPP không dự · khung đỏ = giá thấp nhất)' % (l['code'], l['name'][:90])))
    # giá trị ước tính
    start = add_month(opened, 1)
    val = []
    for l in rel:
        if l['mine'] < 0: continue
        bid = l['bids'][l['mine']]['price']
        its = [l['item']] if l.get('item') else l.get('items') or []
        cs = [((it.get('code') or '').upper().split(' ')[0].split('-')[0], it.get('qty') or 0) for it in its]
        mmh = sum(PRICE[c]['unit'] * q for c, q in cs if c in PRICE and q)
        code = ', '.join(c for c, _ in cs); qty = sum(q for _, q in cs)
        pr = PRICE.get(cs[0][0]) if len(cs) == 1 else None
        fy, rem, cw, fy2, nw = fy_split(bid, start, dur)
        _, _, cm, _, nm = fy_split(mmh, start, dur) if mmh else (0, 0, 0, 0, 0)
        val.append({'lot': l, 'code': code or '—', 'qty': qty, 'bid': bid, 'mmh': mmh, 'npp_unit': pr['unit'] if pr else 0, 'fy': fy, 'rem': rem, 'cw': cw, 'cm': cm, 'fy2': fy2, 'nw': nw, 'nm': nm})
    return dict(pk=pk, I=I, F=F, name=name, inv=inv, price=price, dur=dur, opened=opened, start=start, lots=lots, rel=rel, byPart=byPart, allorig=allorig, ev=ev, val=val,
                links={'bb': f_bb, 'nt': f_nt, 'tb': f_tb, 'ky': f_ky, 'dg': f_dg}, kytxt=bool(ktxt)), ''

def chance(l):
    b = l['bids']; k = l['mine']; n = len(b)
    if k < 0: return ''
    if n == 1: return '<span class="ok">Nhà thầu duy nhất ⇒ trúng nếu đạt kỹ thuật</span>'
    if k == 0: return '<span class="ok">Giá thấp nhất (thấp hơn hạng 2: %s) ⇒ trúng nếu đạt kỹ thuật</span>' % pct(b[1]['price'], b[0]['price']).lstrip('+')
    return '<span class="no">Giá xếp hạng %d/%d (cao hơn giá thấp nhất %s) ⇒ chỉ trúng nếu %d nhà thầu giá thấp hơn không đạt kỹ thuật</span>' % (k + 1, n, pct(b[k]['price'], b[0]['price']), k)

def html_mo(R, for_pdf=False):
    pk, F = R['pk'], R['F']; L = R['links']
    a = lambda f, t: f'<a href="{H(f["url"])}">{H(t)}</a>' if f and f.get('url') else ''
    src = ' · '.join(x for x in [f'<a href="{H(R["I"]["url"])}">Trang gói trên muasamcong</a>' if R['I'].get('url') else '', a(L['bb'], 'Biên bản mở thầu'), a(L['nt'], 'Bảng nhà thầu tham dự'),
                                 a(L['tb'], 'Thông báo mời thầu'), a(L['ky'], 'HSMT – Yêu cầu kỹ thuật'), a(L['dg'], 'HSMT – Tiêu chuẩn đánh giá')] if x)
    mine = [l for l in R['rel'] if l['mine'] >= 0]; others = [l for l in R['rel'] if l['mine'] < 0]
    s = []
    s.append(f'<h3>1. Thông tin gói thầu</h3>')
    s.append(tbl(['Mục', 'Nội dung'], [
        ['Gói thầu', name_or(R['name'])], ['Chủ đầu tư', R['inv']], ['Số TBMT', pk['no']],
        ['Giá gói thầu', f"{vnd(R['price'])} đ (~{usd(R['price'])})" if R['price'] else 'Không rõ'],
        ['Số phần / lô', f"{len(R['lots'])} phần" + (' · xét chọn nhà thầu theo TỪNG PHẦN (nhà thầu chào 1 hoặc nhiều phần, mỗi phần chọn riêng)' if R['byPart'] else ' · chọn nhà thầu cho CẢ GÓI')],
        ['Hình thức / phương thức', ' · '.join(x for x in [F['Hình thức lựa chọn nhà thầu'], F['Phương thức lựa chọn nhà thầu'], F['Hình thức dự thầu']] if x) or 'Không rõ'],
        ['Nguồn vốn', F['Nguồn vốn'] or 'Không rõ'], ['Loại hợp đồng', F['Loại hợp đồng'] or 'Không rõ'],
        ['Thời gian thực hiện hợp đồng', F['Thời gian thực hiện gói thầu'] or f"{R['dur']} tháng (mặc định)"],
        ['Mở thầu', (F['Thời điểm hoàn thành mở thầu'] or F['Thời điểm đóng thầu'] or R['opened'].strftime('%d/%m/%Y')) + (f" · {F['Số lượng nhà thầu']} nhà thầu" if F['Số lượng nhà thầu'] else '')],
        ['Bảo đảm dự thầu', F['Số tiền đảm bảo dự thầu'] or 'Không rõ'], ['NPP của MANI tham dự', f"{pk['npp']} · {len(mine)} phần"]]))
    s.append(f'<p class="m">Tài liệu tham chiếu: {src}</p>')
    s.append('<h3>2. Yêu cầu kỹ thuật các phần liên quan sản phẩm MMH</h3>')
    if R['allorig']: s.append(f"<p>HSMT có yêu cầu / tiêu chí: <b>{H(', '.join(R['allorig']))}</b>. Yêu cầu xuất xứ G7 / EU / FDA thường loại hàng sản xuất tại Ấn Độ, Trung Quốc… (trừ khi có chứng nhận tương ứng). Hàng MANI (kể cả sản xuất tại Việt Nam) đáp ứng các yêu cầu về xuất xứ.</p>")
    elif R['kytxt']: s.append('<p>HSMT không nêu yêu cầu xuất xứ riêng (G7 / EU / FDA…) cho hàng hóa.</p>')
    else: s.append('<p class="m">Chưa có file HSMT – yêu cầu kỹ thuật (thường cần VNeGP Agent để tải) ⇒ phần này đánh giá theo tên phần / lô.</p>')
    shown = mine + others[:25]
    for g in GORDER:
        ls = [l for l in shown if l.get('group') == g]
        if not ls: continue
        s.append(f'<p><b>{H(g)}</b> · {len(ls)} phần ({sum(1 for l in ls if l["mine"] >= 0)} phần NPP dự)</p>')
        rows = [[l['code'], H(l['name'][:110]) + (f'<br><span class="m">SL {vnd(l["qty"])} {H(l.get("unit", ""))}</span>' if l.get('qty') else ''),
                 H(l['level']) + ('<br><span class="m">Xuất xứ / tiêu chuẩn: ' + H(', '.join(l['orig'])) + '</span>' if l['orig'] else ''), code_cell(l), status_cell(l)] for l in ls]
        s.append(tbl(['Phần', 'Tên phần / lô', 'Thông số kỹ thuật', 'Mã MANI đáp ứng · giá tối thiểu BV công · giá MANI→NPP (/đơn vị)', 'NPP dự / lý do không dự'], rows, me=lambda r: 'NPP dự' in r[4] and 'không dự' not in r[4]))
    if len(others) > 25: s.append(f'<p class="m">… và {len(others) - 25} phần khác thuộc nhóm sản phẩm MMH mà NPP không dự (xem bảng nhà thầu tham dự).</p>')
    s.append('<p class="m">Giá tối thiểu BV công = giá NPP bán bệnh viện công tối thiểu theo báo giá đại lý – bệnh viện (đã gồm VAT). Đơn giá đối thủ = giá dự thầu ÷ số lượng của phần trong HSMT. ★ = mã NPP chào theo file thầu của NPP.</p>')
    for cid, f, cap in [e for e in R['ev'] if e[0].startswith('ky')]:
        s.append(f'<p class="m">{H(cap)}</p><img class="ev" src="{"file://" + f if for_pdf else "cid:" + cid}">')
    s.append('<h3>3. Biên bản mở thầu · nhà thầu và giá từng phần NPP tham dự</h3>')
    rows = []
    for l in mine:
        bs = '<br>'.join(('<b>' if i == l['mine'] else '') + f"{i+1}. {H(b['name'][:60])} — {vnd(b['price'])} đ" + ('</b>' if i == l['mine'] else '') for i, b in enumerate(l['bids']))
        rows.append([l['code'], l['name'][:90], bs, chance(l)])
    s.append(tbl(['Phần', 'Tên phần / lô', 'Nhà thầu · giá dự thầu sau giảm giá (thấp ⇒ cao)', 'Khả năng trúng của NPP'], rows))
    s.append('<p class="m">Gói xét theo từng phần: nhà thầu đạt kỹ thuật có giá dự thầu thấp nhất (sau ưu đãi nếu có) được đề nghị trúng phần đó.</p>')
    for cid, f, cap in [e for e in R['ev'] if e[0].startswith('bb')]:
        s.append(f'<p class="m">{H(cap)} (khung đỏ = {H(pk["npp"])})</p><img class="ev" src="{"file://" + f if for_pdf else "cid:" + cid}">')
    bx = [e for e in R['ev'] if e[0].startswith('bx')]
    if bx: s.append('<p><b>Các phần MMH đáp ứng được nhưng NPP không dự</b> (lý do theo số liệu ở mục 2):</p>')
    for cid, f, cap in bx:
        s.append(f'<p class="m">{H(cap)}</p><img class="ev" src="{"file://" + f if for_pdf else "cid:" + cid}">')
    s.append(f'<h3>4. Giá trị ước tính (tỷ giá {vnd(RATE)} VND/USD)</h3>')
    if R['val']:
        tw = sum(v['bid'] for v in R['val']); tm = sum(v['mmh'] for v in R['val']); cw = sum(v['cw'] for v in R['val']); cm = sum(v['cm'] for v in R['val'])
        v0 = R['val'][0]
        rows = [[v['lot']['code'], v['code'], v['qty'] and vnd(v['qty']) or '—', usd(v['bid']), usd(v['mmh']) if v['mmh'] else '—', usd(v['cw']), usd(v['cm']) if v['mmh'] else '—'] for v in R['val']]
        rows.append(['<b>Tổng</b>', '', '', f'<b>{usd(tw)}</b>', f'<b>{usd(tm)}</b>' if tm else '—', f'<b>{usd(cw)}</b>', f'<b>{usd(cm)}</b>' if tm else '—'])
        s.append(tbl(['Phần', 'Mã MANI', 'SL', 'Giá trị trúng thầu (NPP bán BV)', 'Doanh số MMH (MANI bán NPP)', f'Trong FY{v0["fy"]} · trúng thầu', f'Trong FY{v0["fy"]} · doanh số MMH'], rows))
        s.append(f"<p class=\"m\">Giá trị trúng thầu = giá dự thầu của NPP (đã gồm VAT) nếu trúng. Doanh số MMH = số lượng × giá MANI bán NPP theo mã (chưa VAT). Phần trong FY{v0['fy']} = giá trị ÷ {R['dur']} tháng hợp đồng × {v0['rem']} tháng "
                 f"còn lại của FY{v0['fy']} (giả định hợp đồng bắt đầu {R['start'].strftime('%m/%Y')}, tháng sau mở thầu; FY{v0['fy']} kết thúc 08/{1958 + v0['fy'] + 1}). Phần còn lại rơi vào FY{v0['fy2']}: {usd(sum(v['nw'] for v in R['val']))} trúng thầu"
                 + (f", {usd(sum(v['nm'] for v in R['val']))} doanh số MMH." if tm else '.') + '</p>')
        miss = [v['lot']['code'] for v in R['val'] if not v['mmh']]
        if miss: s.append(f'<p class="m">Chưa ước tính được doanh số MMH ở phần {", ".join(miss)}: file thầu của NPP chưa ghi mã / số lượng khớp giá dự thầu.</p>')
    else: s.append('<p>NPP không tham dự phần nào của gói này.</p>')
    s.append('<h3>5. Nhận xét</h3><ul>')
    w1 = [l for l in mine if l['mine'] == 0]; wl = [l for l in mine if l['mine'] > 0]
    if w1: s.append(f'<li>{pk["npp"]} xếp giá thấp nhất ở {len(w1)}/{len(mine)} phần đã dự: {H(", ".join(l["code"] for l in w1))}.</li>')
    if wl: s.append(f'<li>{len(wl)} phần {pk["npp"]} có giá cao hơn nhà thầu khác: {H(", ".join(l["code"] for l in wl))}.</li>')
    if others: s.append(f'<li>{len(others)} phần thuộc nhóm sản phẩm MMH mà NPP không dự.</li>')
    s.append('<li>Hệ thống sẽ trả lời tiếp trong luồng email này khi gói có kết quả lựa chọn nhà thầu.</li></ul>')
    return '\n'.join(s)

def name_or(s): return s or 'Không rõ'

def to_name(R):
    w = post({'action': 'botNpp', 'op': 'who', 'prov': R['pk']['city'] or R['I'].get('prov', ''), 'text': R['inv'] + ' ' + R['pk']['hospital']})
    return (w.get('to') or ['Viet Ha'])[0]

def make_pdf(title, body_html, out):
    page = f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS} @page{{size:A4;margin:12mm}} h1{{font-size:18px;color:#2C4A5E;text-transform:uppercase;margin:0 0 4px}}</style></head><body><h1>{H(title)}</h1>{body_html}</body></html>'
    hp = out[:-4] + '.html'; open(hp, 'w', encoding='utf-8').write(page)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); pg.goto('file://' + hp); pg.pdf(path=out, format='A4', print_background=True, margin={'top': '12mm', 'bottom': '12mm', 'left': '11mm', 'right': '11mm'}); b.close()
    return out

def send(no, stage, subject, html_body, inl, att, R):
    b64 = lambda p: base64.b64encode(open(p, 'rb').read()).decode()
    body = {'action': 'botNpp', 'op': 'send', 'no': no, 'stage': stage, 'subject': subject, 'html': f'<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:14px;color:#1F2A33"><style>{CSS}</style>{html_body}</div>',
            'inl': [{'cid': c, 'name': os.path.basename(f), 'mime': 'image/jpeg', 'b64': b64(f)} for c, f, _ in inl],
            'att': [{'name': os.path.basename(a), 'mime': 'application/pdf', 'b64': b64(a)} for a in att],
            'prov': R['pk']['city'] or R['I'].get('prov', ''), 'text': R['inv'] + ' ' + R['pk']['hospital'], 'mode': 'live' if MODE in ('live', 'test') else 'preview'}
    if MODE == 'test': body['testTo'] = TEST_TO
    if MODE == 'dry': log('  (dry) không gửi:', subject); return {'ok': True, 'dry': True}
    r = post(body, tries=2)
    log('  gửi:', json.dumps({k: r.get(k) for k in ('ok', 'stage', 'preview', 'to', 'cc', 'replied', 'skip', 'error', 'code')}, ensure_ascii=False))
    return r

def run_mo(pk, hits):
    R, why = build_mo(pk, hits)
    if not R: log('  bỏ qua:', why); return False
    who = to_name(R)
    subj = f"[Thầu] Mở thầu gói thầu – {R['inv'][:80]} – {pk['no']}"
    intro = (f"<p>Dear {H(who)},</p><p>Hệ thống Theo dõi thầu thông báo biên bản mở thầu gói <b>{H(name_or(R['name']))}</b> của <b>{H(R['inv'])}</b>, số TBMT <b>{pk['no']}</b>. "
             f"NPP của MANI tham dự: <b>{H(pk['npp'])}</b>. Chi tiết bên dưới; bản PDF tóm tắt đính kèm.</p>")
    sig = '<p>Trân trọng,<br>Hệ thống Theo dõi thầu MMH</p>'
    bodyE = intro + html_mo(R) + sig
    pdf = make_pdf(f"Mở thầu · {R['inv']} · {pk['no']}", html_mo(R, True), os.path.join(WORK, pk['no'], f"{pk['no']} - Phan tich mo thau.pdf"))
    shutil.copy(pdf, os.path.join(OUTD, os.path.basename(pdf)))
    open(os.path.join(OUTD, pk['no'] + ' - email.html'), 'w', encoding='utf-8').write(bodyE)
    r = send(pk['no'], 'mo', subj, bodyE, R['ev'], [pdf], R)
    return bool(r.get('ok'))

def run_kq(pk, hits, st):
    k = post({'action': 'botNpp', 'op': 'kq', 'no': pk['no']})
    if not k.get('ok') or not k.get('hasKq') or not k.get('lots'): log('  chưa có kết quả'); return False
    npre = NPPRE[pk['npp']]; rows = []; won = []
    for lot, ents in k['lots'].items():
        if lot.startswith('n:'): continue
        if not any(re.search(npre, nk(e[0])) for e in ents): continue
        w = [e for e in ents if e[3]]
        me = [e for e in ents if re.search(npre, nk(e[0]))][0]
        if me[3]: won.append((lot, me))
        rows.append([lot.upper(), '<br>'.join(H(e[0][:50]) + f' — {vnd(e[1])} đ' for e in w) or 'Không rõ', '<span class="ok">TRÚNG</span>' if me[3] else '<span class="no">Không trúng</span>', H(me[2]) if not me[3] else ''])
    if not rows: log('  kết quả chưa có phần của NPP'); return False
    R = {'pk': pk, 'I': {}, 'inv': pk['hospital'], 'name': pk['tender']}
    who = to_name(R)
    kd = dparse(k.get('kqDate')) or datetime.date.today()
    dur = months(str(pk.get('dur') or ''), 12); start = add_month(kd, 1)
    tw = sum(e[1] for _, e in won); fy, rem, cw, fy2, nw = fy_split(tw, start, dur) if tw else (0, 0, 0, 0, 0)
    b = (f"<p>Dear {H(who)},</p><p>Gói <b>{H(pk['tender'] or pk['no'])}</b> của <b>{H(pk['hospital'])}</b> (số TBMT <b>{pk['no']}</b>) đã có kết quả lựa chọn nhà thầu"
         + (f" ngày {kd.strftime('%d/%m/%Y')}" if k.get('kqDate') else '') + f". Kết quả các phần {H(pk['npp'])} tham dự:</p>"
         + tbl(['Phần', 'Nhà thầu trúng · giá trúng', pk['npp'], 'Lý do không trúng'], rows))
    if won: b += f"<p>{H(pk['npp'])} trúng {len(won)} phần, giá trị {vnd(tw)} đ (~{usd(tw)}); trong FY{fy} (từ {start.strftime('%m/%Y')}, {rem} tháng): ~{usd(cw)}, FY{fy2}: ~{usd(nw)}.</p>"
    links = ' · '.join(f'<a href="{H(f["url"])}">{H(f["kind"] or f["name"])}</a>' for f in k.get('files', []) if f.get('url') and re.search(r'kết quả|danh sách', f.get('kind', '') + f.get('name', ''), re.I))
    if links: b += f'<p class="m">Tài liệu: {links}</p>'
    b += '<p>Trân trọng,<br>Hệ thống Theo dõi thầu MMH</p>'
    d = os.path.join(WORK, pk['no']); os.makedirs(d, exist_ok=True)
    pdf = make_pdf(f"Kết quả · {pk['hospital']} · {pk['no']}", b, os.path.join(d, f"{pk['no']} - Ket qua.pdf"))
    shutil.copy(pdf, os.path.join(OUTD, os.path.basename(pdf)))
    r = send(pk['no'], 'kq', f"[Thầu] Kết quả gói thầu – {pk['hospital'][:80]} – {pk['no']}", b, [], [pdf], R)
    return bool(r.get('ok'))

OUTD = os.path.join(REPO, 'npp-out'); os.makedirs(OUTD, exist_ok=True)

def main():
    if not KEY: log('Thiếu WT_BOT_KEY'); sys.exit(1)
    P = load_npp()
    if ONLY: P = {k: v for k, v in P.items() if k in ONLY}
    st = post({'action': 'botNpp', 'op': 'state'}); S = st.get('state') or {}
    log(f'Gói NPP Pending: {len(P)} · đã gửi: {len(S)} · gửi thật: {"bật" if st.get("on") else "tắt"}')
    H = load_hits(set(P))
    todo = []
    for no, pk in sorted(P.items()):
        tgt = os.environ.get('NPP_TARGET') if MODE == 'plan' else MODE
        s = (S.get('_test', {}) if tgt == 'test' else S).get(no, {}); files = [f for h in H.get(no, []) for f in h.get('files', [])]
        has_bb = bool(pick(files, r'biên bản mở thầu') and pick(files, r'nhà thầu tham dự'))
        if tgt not in ('live', 'test') or 'mo' not in s:
            if has_bb: todo.append((no, 'mo'))
            else: todo.append((no, 'queue'))
        elif 'kq' not in s: todo.append((no, 'kq'))
    need = sum(1 for _, t in todo if t in ('mo', 'kq'))
    if (MODE == 'live' or os.environ.get('NPP_TARGET') == 'live') and not st.get('on'):
        log('Gửi thật đang TẮT (botNpp op=on để bật) ⇒ chỉ đặt tải hồ sơ còn thiếu.'); need = 0
        if MODE == 'live': todo = [x for x in todo if x[1] == 'queue']
    log('Việc:', ', '.join(f'{n}:{t}' for n, t in todo) or '(không có)')
    if MODE == 'plan':
        go = os.environ.get('GITHUB_OUTPUT')
        if go: open(go, 'a').write(f'need={1 if need else 0}\n')
        for no, t in todo:
            if t == 'queue':
                r = post({'action': 'botRoute', 'op': 'pkg', 'no': no, 'dry': 1}, tries=2)
                log(f'  {no}: đặt tải →', r.get('queued'), r.get('missing'))
                time.sleep(3)
        return
    MAXN = int(os.environ.get('NPP_MAX') or (99 if MODE in ('live', 'test') or ONLY else 1)); done = 0
    for no, t in todo:
        if t == 'queue': continue   # bước plan đã đặt tải
        if done >= MAXN: continue
        done += 1
        log(f'== {no} ({P[no]["npp"]}, {P[no]["hospital"]}) · {t}')
        try:
            if t == 'mo': run_mo(P[no], H.get(no, []))
            else: run_kq(P[no], H.get(no, []), (S.get('_test', {}) if MODE == 'test' else S).get(no, {}))
        except Exception as e:
            import traceback; log('  LỖI:', e); traceback.print_exc()
    open(os.path.join(OUTD, 'log.txt'), 'w', encoding='utf-8').write('\n'.join(LOG))

if __name__ == '__main__': main()
