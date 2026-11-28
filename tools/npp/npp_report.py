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
import notify_mail as NM
import json, os, re, sys, base64, subprocess, unicodedata, datetime, html, time, urllib.request, csv, glob, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..'))
B = json.load(open(os.path.join(REPO, 'backends.json'), encoding='utf-8'))
URL = B['tender-info']['url']
KEY = os.environ.get('WT_BOT_KEY', '')
MODE = os.environ.get('NPP_MODE', 'plan')
ONLY = [re.sub(r'-\d+$', '', x) for x in re.split(r'[,\s]+', (os.environ.get('NPP_NO') or '').strip().upper()) if x]
TEST_TO = (os.environ.get('NPP_TEST_TO') or 'Giang').strip()
FORCE = os.environ.get('NPP_FORCE') == '1'
RATE = 26000
WORK = os.environ.get('NPP_WORK', '/tmp/npp')
os.makedirs(WORK, exist_ok=True)
LOG = []
FAIL = []                         # gói gửi lỗi (workflow báo đỏ)
QUEUE = []                        # (số TBMT, [loại tài liệu], giờ chờ) cần tải ưu tiên

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
PRICE_N = {re.sub(r'[^A-Z0-9]', '', k): v for k, v in PRICE.items()}
def unit_price(code):
    """giá MANI→NPP / đơn vị; ô nhiều mã hoặc mã thiếu đuôi ⇒ trung bình các mã khớp"""
    c0 = re.sub(r'[^A-Z0-9]', '', str(code or '').upper())
    if c0 in PRICE_N: return PRICE_N[c0]['unit']
    hit = []
    for part in re.split(r'[;,/&+\s]+', str(code or '').upper()):
        c = re.sub(r'[^A-Z0-9]', '', part)
        if len(c) < 4: continue
        m = [PRICE_N[c]] if c in PRICE_N else [v for k, v in PRICE_N.items() if k.startswith(c)]
        if m: hit.append(sum(x['unit'] for x in m) / len(m))
    return sum(hit) / len(hit) if hit else 0
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
    """phần NPP không dự ⇒ lý do ngắn (không khẳng định thay NPP)"""
    if not l['codes']: return l.get('why') or 'Không có mã MANI khớp thông số HSMT'
    pubs = [HOSP[c.upper()]['pub'] for c in l['codes'] if c.upper() in HOSP]
    if not pubs or not l.get('qty') or not l['bids']: return 'Cần hỏi NPP'
    return 'Giá đối thủ thấp hơn giá tối thiểu của MANI' if l['bids'][0]['price'] / l['qty'] < min(pubs) else 'MANI cạnh tranh được về giá ⇒ cần hỏi NPP'

def code_cell(l):
    """mã MANI ĐÁP ỨNG theo HSMT (không đoán) + mã NPP chào (★) kèm kết quả đối chiếu"""
    out = []
    if l.get('basis'): out.append('<span class="m">HSMT: ' + H(' · '.join(l['basis'])) + '</span>')
    for c in [c for c in l.get('npp_codes', []) if c]:
        r = (l.get('npp_chk') or {}).get(c)
        tag = '' if r is None else ' <span class="ok">✓ khớp HSMT</span>' if r == '' else f' <span class="no">✗ lệch {H(r)}</span>'
        hp = HOSP.get(c)
        out.append(f'<b>{H(c)} ★</b>' + (f' · {vnd(hp["pub"])} đ' if hp else '') + tag)
    cs = [c.upper() for c in l['codes'] if c.upper() not in l.get('npp_codes', [])]
    for c in cs[:8]:
        hp = HOSP.get(c); out.append(H(c) + (f' · {vnd(hp["pub"])} đ' if hp else ''))
    if len(cs) > 8: out.append(f'<span class="m">+{len(cs) - 8} mã khớp</span>')
    if not l['codes']: out.append('<span class="no">' + H(l.get('why') or 'Không có mã MANI khớp') + '</span>')
    return '<br>'.join(out) or '—'

def status_cell(l):
    if l['mine'] < 0: return '<span class="no">Không dự</span><br><span class="m">' + H(why_not(l)) + '</span>'
    return '<span class="ok">Dự</span>'

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

# ───────────── mã MANI ĐÁP ỨNG theo yêu cầu kỹ thuật đọc được trong HSMT (v1.5, 28/11/2026 — người dùng: "không phỏng đoán")
# Mỗi thông số HSMT nêu ra phải khớp với dữ liệu catalogue (chỉ: mani_sutures.csv · dao: tên mã trong MMH_Prices.gs);
# HSMT không nêu thông số nào ⇒ không xét thông số đó; thiếu thông số bắt buộc (chỉ: chất liệu + cỡ · dao: loại + cỡ / góc / G) ⇒ không đưa mã.
def _f(x):
    try: return float(str(x).replace(',', '.'))
    except Exception: return None
CURVE = {'1/4': 90, '5/16': 113, '3/8': 135, '7/16': 158, '1/2': 180, '5/8': 225}
NEEDLE = [('spatula', r'spatula|hinh thang|luc giac', r'spatula'), ('tron dau cat', r'tron dau cat|cut taper|taper ?cut', r'cut taper'),
          ('tron', r'kim tron|taper', r'taper point'), ('tam giac', r'tam giac|cat nguoc|reverse|cutting', r'reverse cut'), ('chich', r'kim chich|lancet', r'lancet')]
def sut_req(lot_name, spec):
    """yêu cầu kỹ thuật của 1 phần chỉ khâu đọc từ tên phần + dòng HSMT"""
    nm, sp = str(lot_name or ''), str(spec or '')
    both = nm + ' ' + sp; t = nk(both); tl = both.lower().replace(',', '.')
    mat = next((m for m, ws in MAT if any(w in nk(nm) for w in ws)), '') or next((m for m, ws in MAT if any(w in nk(sp) for w in ws)), '')
    sz = re.search(r'\b(\d{1,2})\s?[-/]\s?0\b', nm) or re.search(r'\b(\d{1,2})\s?[-/]\s?0\b', sp)
    R = {'mat': mat, 'size': (sz.group(1) + '-0') if sz else ''}
    R['needle'] = next((k for k, rx, _ in NEEDLE if re.search(rx, t)), '')
    R['straight'] = bool(re.search(r'kim thang|straight', t))
    R['curve'] = sorted({CURVE[f] for f in re.findall(r'\b(1/4|5/16|3/8|7/16|1/2|5/8)\b', tl)})
    R['double'] = True if re.search(r'\b2 (dau )?kim|hai (dau )?kim|double', t) else False if re.search(r'\b1 (dau )?kim|mot (dau )?kim|single', t) else None
    mm = [(_f(a), _f(b)) for a, b in re.findall(r'(\d+(?:[.,]\d+)?)\s*(?:-|đến|den|~|–)\s*(\d+(?:[.,]\d+)?)\s*mm', tl)]
    one = [_f(a) for a in re.findall(r'(\d+(?:[.,]\d+)?)\s*mm', tl)]
    R['nlen'] = [r for r in mm if r[0] and r[1] and 2.5 <= r[0] <= 40] + [(v, v) for v in one if v and 2.5 <= v <= 40 and not any(a <= v <= b for a, b in mm if a and b)]
    R['ndia'] = [v for v in one if v and 0.03 <= v < 1]
    cm = re.findall(r'(≥|>=|tối thiểu|toi thieu|ít nhất|it nhat|trên|tren)?\s*(\d+(?:[.,]\d+)?)\s*cm', tl)
    R['tlen'] = [(_f(v), bool(g)) for g, v in cm if _f(v) and 5 <= _f(v) <= 150]
    return R
def sut_fit(r, R):
    """dòng catalogue r có đáp ứng R không ⇒ (đạt?, lý do không đạt)"""
    if R['mat'] and nk(r['Suture (EN)']).find({'pga': 'pga', 'silk': 'silk'}.get(R['mat'], R['mat'])) < 0: return False, 'chất liệu'
    if R['size'] and r['Cỡ chỉ (USP)'].split(' ')[0] != R['size']: return False, 'cỡ chỉ'
    ne = nk(r['Needle (EN)'])
    if R['needle']:
        rx = dict((k, x) for k, _, x in NEEDLE)[R['needle']]
        if not re.search(rx, ne) or (R['needle'] == 'tron' and 'cut' in ne): return False, 'kiểu kim'
    cv = nk(r['Độ cong'])
    if R['straight'] and 'kim thang' not in cv: return False, 'kim thẳng'
    if R['curve']:
        degs = [int(x) for x in re.findall(r'(\d{2,3})°', r['Độ cong'])]
        if not any(d in degs for d in R['curve']): return False, 'độ cong'
    if R['double'] is True and r['Một đầu kim (Single-armed)'] == 'Có': return False, 'số kim'
    if R['double'] is False and r['Một đầu kim (Single-armed)'] != 'Có': return False, 'số kim'
    nl = _f(re.sub(r'[^\d.]', '', r['Chiều dài kim']))
    if R['nlen'] and nl and not any(a - 0.5 <= nl <= b + 0.5 for a, b in R['nlen']): return False, 'chiều dài kim'
    dia = [_f(x) for x in re.findall(r'(\d+\.\d+)', r['Đường kính kim'])]
    if R['ndia'] and dia and not any(abs(d - x) <= 0.03 for d in dia for x in R['ndia']): return False, 'đường kính kim'
    tl = _f(re.sub(r'[^\d.]', '', r['Chiều dài chỉ']))
    if R['tlen'] and tl and not any((tl >= v) if ge else abs(tl - v) <= max(2, v * 0.1) for v, ge in R['tlen']): return False, 'chiều dài chỉ'
    return True, ''
def sut_basis(R):
    b = []
    if R['mat']: b.append(R['mat'])
    if R['size']: b.append(R['size'])
    if R['needle']: b.append('kim ' + R['needle'])
    if R['straight']: b.append('kim thẳng')
    if R['curve']: b.append('cong ' + '/'.join(k for k, v in CURVE.items() if v in R['curve']))
    if R['double'] is not None: b.append('2 kim' if R['double'] else '1 kim')
    if R['nlen']: b.append('kim ' + ', '.join(('%g' % a if a == b2 else '%g–%g' % (a, b2)) for a, b2 in R['nlen'][:2]) + ' mm')
    if R['ndia']: b.append('Ø kim ' + ', '.join('%g' % x for x in R['ndia'][:2]) + ' mm')
    if R['tlen']: b.append('chỉ ' + ', '.join(('≥ ' if g else '') + '%g' % v for v, g in R['tlen'][:2]) + ' cm')
    return b

KNIFE = []
for _c, _p in PRICE.items():
    if _p['kind'] != 'dao': continue
    n = nk(_p['name']); nr = _p['name'].replace(',', '.')
    fam = ('mvr' if re.match(r'^M(VR|PK)', _c) else 'liem' if 'luoi liem' in n else 'cung' if 'cung mac' in n else 'thang' if _c.startswith('MST') else
           'rachR' if _c.startswith('MRS') else 'rachT' if _c.startswith('MSS') else 'rach' if _c.startswith('MSL') else '')
    m = re.search(r'(\d+(?:\.\d+)?)\s*mm', nr); a = re.search(r'(\d+(?:\.\d+)?)°', nr); g = re.search(r'(\d{2})G', nr)
    KNIFE.append({'code': _p['code'], 'fam': fam, 'mm': float(m.group(1)) if m else None, 'deg': float(a.group(1)) if a else None, 'g': int(g.group(1)) if g else None,
                  'safe': bool(re.search(r'an toan|nap chan', n) or re.search(r'SK$', _c)), 'short': 'dau ngan' in n or _c.endswith('SH'), 'curve': 'cong' in n and _c.endswith('AB'), 'mark': 'danh dau' in n})
def knife_req(lot_name, spec):
    both = str(lot_name or '') + ' ' + str(spec or ''); t = nk(both); tl = both.lower().replace(',', '.')
    fam = ('mvr' if re.search(r'\bmvr\b|\b(19|20|21|23|24|25|27) ?g\b', t) else 'liem' if re.search(r'luoi liem|crescent', t) else 'cung' if re.search(r'cung mac', t) and not re.search(r'giac mac', t) else
           'thang' if re.search(r'(15|22[.,]?5|30|45) ?(do|°)|stab|luoi thang|chich', t) and not re.search(r'\brach\b.*\d[.,]\d+ ?mm', t) else 'rach' if re.search(r'\brach\b|slit|keratome|giac mac|phaco', t) else '')
    if fam == 'rach' and re.search(r'luoi thang', t): fam = 'rachT'
    R = {'fam': fam, 'mm': sorted({_f(x) for x in re.findall(r'(\d[.]\d{1,2})\s*mm', tl) if 0.7 <= _f(x) <= 6}),
         'deg': sorted({_f(x) for x in re.findall(r'(\d{1,2}(?:\.\d)?)\s*(?:°|độ|do\b)', tl) if _f(x) in (0, 15, 22.5, 22, 30, 45)}),
         'g': sorted({int(x) for x in re.findall(r'\b(19|20|21|23|24|25|27)\s?g\b', t)}),
         'safe': bool(re.search(r'an toan|nap (chan|bao ve)', t)), 'curve': bool(re.search(r'cong\b', t) and fam == 'rach'), 'short': bool(re.search(r'dau ngan', t))}
    R['deg'] = [22.5 if d == 22 else d for d in R['deg']]
    return R
def knife_fit(k, R):
    if not R['fam']: return False, 'loại dao'
    fam = k['fam'] if k['fam'] not in ('rachR',) else 'rach'
    if fam != R['fam']: return False, 'loại dao'
    if R['fam'] == 'mvr':
        if not R['g'] and not R['mm']: return False, 'thiếu cỡ G'
        if R['g'] and k['g'] not in R['g']: return False, 'cỡ G'
    elif R['fam'] == 'thang':
        if not R['deg']: return False, 'thiếu góc'
        if k['deg'] not in R['deg']: return False, 'góc lưỡi'
    else:
        if not R['mm']: return False, 'thiếu cỡ mm'
        if k['mm'] is None or not any(abs(k['mm'] - x) <= 0.051 for x in R['mm']): return False, 'cỡ mm'
    if R['safe'] != k['safe']: return False, 'nắp an toàn'
    if R['curve'] != k['curve']: return False, 'lưỡi cong'
    if R['short'] != k['short']: return False, 'đầu ngắn'
    return True, ''
def knife_basis(R):
    lab = {'mvr': 'MVR', 'liem': 'lưỡi liềm', 'cung': 'củng mạc', 'thang': 'lưỡi thẳng', 'rach': 'dao rạch', 'rachT': 'dao rạch lưỡi thẳng'}.get(R['fam'], '')
    return [x for x in [lab, ', '.join('%gG' % g for g in R['g']), ', '.join('%g mm' % m for m in R['mm']), ', '.join('%g°' % d for d in R['deg']),
                        'nắp an toàn' if R['safe'] else '', 'lưỡi cong' if R['curve'] else '', 'đầu ngắn' if R['short'] else ''] if x]

def mani_match(ltype, lot_name, spec):
    """⇒ {'codes': mã đáp ứng, 'basis': thông số HSMT đã đối chiếu, 'why': lý do không có mã, 'check': hàm kiểm 1 mã}"""
    if not spec: return {'codes': [], 'basis': [], 'why': 'Chưa đọc được yêu cầu kỹ thuật của phần này trong HSMT', 'check': lambda c: None}
    if ltype == 'chi':
        R = sut_req(lot_name, spec)
        if not R['mat'] or not R['size']:
            return {'codes': [], 'basis': sut_basis(R), 'why': 'HSMT không nêu đủ chất liệu và cỡ chỉ', 'check': lambda c: None}
        ok = [r['Mã đặt hàng'] for r in SUT if sut_fit(r, R)[0]]
        def chk(c):
            r = next((x for x in SUT if x['Mã đặt hàng'].upper() == c.upper()), None)
            return None if not r else sut_fit(r, R)[1]
        return {'codes': ok, 'basis': sut_basis(R), 'why': '' if ok else 'Không có mã MANI khớp đủ thông số HSMT', 'check': chk}
    if ltype == 'dao':
        R = knife_req(lot_name, spec)
        ok = [k['code'] for k in KNIFE if knife_fit(k, R)[0]]
        def chk(c):
            k = next((x for x in KNIFE if x['code'].upper() == c.upper()), None)
            return None if not k else knife_fit(k, R)[1]
        why = '' if ok else ('HSMT không nêu rõ loại dao' if not R['fam'] else 'Không có mã MANI khớp đủ thông số HSMT')
        return {'codes': ok, 'basis': knife_basis(R), 'why': why, 'check': chk}
    if ltype == 'ghim':
        return {'codes': [c for c in ('AZ35WS', 'DS35WS') if c in PRICE], 'basis': ['ghim da'], 'why': '', 'check': lambda c: ''}
    return {'codes': [], 'basis': [], 'why': 'Chưa có dữ liệu thông số để đối chiếu', 'check': lambda c: None}

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
def fy_of(d): return (d.year if d.month >= 9 else d.year - 1) - 1958
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
img.ev{max-width:100%;border:1px solid #C9D6E2;margin:4px 0 2px}a{color:#2F6FB0}
.sum{border:1px solid #BCD4E6;border-radius:6px;padding:8px 12px;margin:6px 0 14px;background:#F7FAFD}.sum p{margin:4px 0}.big{font-size:15px;color:#2C4A5E}ul{margin:4px 0;padding-left:20px}"""
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
    if not f_ky: return None, 'chưa có HSMT (yêu cầu kỹ thuật) ⇒ chờ tải, chưa gửi'
    p_ky = blob(f_ky, d)
    if not p_ky or not pdftext(p_ky).strip(): return None, 'HSMT chưa tải được / không đọc được chữ ⇒ chưa gửi'
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
        MM = mani_match(l['lt'] or lot_type(l['name']), l['name'], sp[3] if sp else '')   # v1.5: chỉ mã khớp thông số đọc được trong HSMT
        l['codes'], l['basis'], l['why'] = MM['codes'], MM['basis'], MM['why']
        q = re.findall(r'\b(Sợi|Cái|Chiếc|Hộp|Vỉ|Bộ|Cây|Tép|Gói|Tuýp)\s+(\d[\d.,]*)\b', sp[3]) if sp else []
        l['unit'] = q[-1][0].lower() if q else ''; l['qty'] = l['qty_h'] = num(q[-1][1]) if q else 0
        its = [l['item']] if l.get('item') else l.get('items') or []
        l['npp_codes'] = [str(it.get('code') or '').upper().split(' ')[0] for it in its if it.get('code')]
        l['npp_chk'] = {c: MM['check'](c) for c in l['npp_codes']}
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
    # giá trị ước tính — giá theo BIÊN BẢN, số lượng theo HSMT (file NPP nhập tay có thể sai ⇒ chỉ dùng để biết mã NPP chào, lệch thì ghi chú)
    start = add_month(opened, 1)
    val, diff = [], []
    for l in rel:
        if l['mine'] < 0: continue
        bid = l['bids'][l['mine']]['price']
        its = [l['item']] if l.get('item') else l.get('items') or []
        cs = [(str(it.get('code') or '').upper().strip(), it.get('qty') or 0) for it in its]
        if not its: diff.append(f"Phần {l['code']}: biên bản có {pk['npp']} dự (giá {vnd(bid)} đ) nhưng file thầu của NPP không có dòng khớp")
        elif not l.get('item'):
            fq = sum(q for _, q in cs); fv = sum((it.get('qty') or 0) * (it.get('price') or 0) for it in its)
            diff.append(f"Phần {l['code']}: file NPP ghi {', '.join(c for c, _ in cs)} SL {vnd(fq)} = {vnd(fv)} đ, biên bản {vnd(bid)} đ")
        hq = l.get('qty_h') or 0
        if hq and len(cs) == 1 and cs[0][1] and abs(cs[0][1] - hq) > 0.5:
            diff.append(f"Phần {l['code']}: file NPP SL {vnd(cs[0][1])}, HSMT SL {vnd(hq)} ⇒ tính theo HSMT")
            cs = [(cs[0][0], hq)]
        if not cs and l.get('codes') and hq: cs = []          # chưa biết mã NPP chào ⇒ không ước tính doanh số MMH
        mmh = sum(unit_price(c) * q for c, q in cs if q)
        code = ', '.join(c for c, _ in cs); qty = sum(q for _, q in cs) or hq
        fy, rem, cw, fy2, nw = fy_split(bid, start, dur)
        _, _, cm, _, nm = fy_split(mmh, start, dur) if mmh else (0, 0, 0, 0, 0)
        val.append({'lot': l, 'code': code or '—', 'qty': qty, 'bid': bid, 'mmh': mmh, 'fy': fy, 'rem': rem, 'cw': cw, 'cm': cm, 'fy2': fy2, 'nw': nw, 'nm': nm})
    left = [it for k, it in enumerate(pk['items']) if k not in used and not any(it is x for l in rel for x in (l.get('items') or []))]
    for it in left:
        if it.get('qty'): diff.append(f"File NPP có {it.get('code') or '(không mã)'} SL {vnd(it['qty'])} × {vnd(it.get('price') or 0)} đ — không khớp phần nào {pk['npp']} dự trong biên bản")
    return dict(pk=pk, I=I, F=F, name=name, inv=inv, price=price, dur=dur, opened=opened, start=start, lots=lots, rel=rel, byPart=byPart, allorig=allorig, ev=ev, val=val, diff=diff,
                links={'bb': f_bb, 'nt': f_nt, 'tb': f_tb, 'ky': f_ky, 'dg': f_dg}, kytxt=bool(ktxt)), ''

def ty(v):
    if not v: return 'Không rõ'
    return (f"{v/1e9:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.') + ' tỷ đ') if v >= 1e9 else (f"{v/1e6:,.0f}".replace(',', '.') + ' tr đ')

def chance(l):
    b = l['bids']; k = l['mine']; n = len(b)
    if k < 0: return ''
    if n == 1: return '<span class="ok">Duy nhất ⇒ trúng nếu đạt kỹ thuật</span>'
    if k == 0: return '<span class="ok">Giá thấp nhất ⇒ trúng nếu đạt kỹ thuật</span>'
    return f'<span class="no">Hạng {k + 1}/{n} · chỉ trúng nếu {k} bên rẻ hơn trượt kỹ thuật</span>'
def rank_cell(l):
    b = l['bids']; k = l['mine']
    if k < 0 or not b: return ''
    if k == 0: return f'<b>1/{len(b)}</b>' + (f'<br><span class="m">rẻ hơn hạng 2 {pct(b[1]["price"], b[0]["price"]).lstrip("+")}</span>' if len(b) > 1 else '')
    return f'<b>{k + 1}/{len(b)}</b><br><span class="m">cao hơn hạng 1 {pct(b[k]["price"], b[0]["price"])}</span>'

def html_mo(R, for_pdf=False):
    pk, F = R['pk'], R['F']; L = R['links']
    a = lambda f, t: f'<a href="{H(f["url"])}">{H(t)}</a>' if f and f.get('url') else ''
    src = ' · '.join(x for x in [f'<a href="{H(R["I"]["url"])}">Trang gói muasamcong</a>' if R['I'].get('url') else '', a(L['bb'], 'Biên bản mở thầu'), a(L['nt'], 'Nhà thầu tham dự'),
                                 a(L['tb'], 'TBMT'), a(L['ky'], 'HSMT – yêu cầu kỹ thuật'), a(L['dg'], 'HSMT – tiêu chuẩn đánh giá')] if x)
    img = lambda cid, f: f'<img class="ev" src="{"file://" + f if for_pdf else "cid:" + cid}">'
    mine = [l for l in R['rel'] if l['mine'] >= 0]; others = [l for l in R['rel'] if l['mine'] < 0 and l['codes']]   # v1.5: chỉ phần có mã MANI khớp HSMT
    V = R['val']; fyn = V[0]['fy'] if V else fy_of(R['start'])
    tw = sum(v['bid'] for v in V); tm = sum(v['mmh'] for v in V); cw = sum(v['cw'] for v in V); cm = sum(v['cm'] for v in V)
    w1 = [l for l in mine if l['mine'] == 0]; wl = [l for l in mine if l['mine'] > 0]
    nb = F['Số lượng nhà thầu'] or str(max((len(l['bids']) for l in R['lots']), default=0))
    dur = F['Thời gian thực hiện gói thầu'] or f"{R['dur']} tháng"
    s = []
    # ── TÓM TẮT
    s.append('<div class="sum">')
    s.append(f"<p class=\"big\"><b>{H(R['inv'])}</b> · {H(name_or(R['name']))} · {H(pk['no'])}</p>")
    s.append(f"<p>Giá gói <b>{ty(R['price'])}</b> · <b>{len(R['lots'])} phần</b>, chọn nhà thầu <b>{'theo từng phần' if R['byPart'] else 'cả gói'}</b> · "
             f"<b>{H(pk['npp'])} dự {len(mine)} phần</b> · hợp đồng <b>{H(dur)}</b> · mở thầu {H((F['Thời điểm hoàn thành mở thầu'] or R['opened'].strftime('%d/%m/%Y'))[:10])}, {H(nb)} nhà thầu</p>")
    rem = V[0]['rem'] if V else 0
    fyl = f'Doanh số MMH ước tính FY{fyn} theo hiệu lực HĐ (09/{fyn + 1958} – 08/{fyn + 1959}) · {rem} tháng từ {R["start"].strftime("%m/%Y")}'
    s.append(tbl(['Giá trị NPP chào (nếu trúng)', 'Doanh số MMH ước tính cả HĐ (nếu trúng)', fyl], [[f'<b>{usd(tw)}</b>', f'<b>{usd(tm)}</b>' if tm else '—', f'<b>{usd(cm)}</b>' if tm else '—']]))
    if V:   # v1.5 (người dùng 28/11/2026): ước tính doanh số từng phần + cách tính đặt ngay đầu email
        dmo = R['dur']
        rows = []
        for v in V:
            up = v['mmh'] / v['qty'] if v['qty'] and v['mmh'] else 0
            rows.append([v['lot']['code'], H(v['code']), vnd(v['qty']) if v['qty'] else '—', vnd(up) + ' đ' if up else '—', usd(v['bid']),
                         usd(v['mmh']) if v['mmh'] else '—', usd(v['mmh'] / dmo) if v['mmh'] else '—', str(min(dmo, v['rem'])), f"<b>{usd(v['cm'])}</b>" if v['mmh'] else '—'])
        rows.append(['<b>Tổng</b>', '', '', '', f'<b>{usd(tw)}</b>', f'<b>{usd(tm)}</b>' if tm else '—', f'<b>{usd(tm / dmo)}</b>' if tm else '—', '', f'<b>{usd(cm)}</b>' if tm else '—'])
        s.append('<p><b>Ước tính doanh số từng phần (nếu trúng)</b></p>')
        s.append(tbl(['Phần', 'Mã NPP chào', 'SL (HSMT)', 'Giá MANI→NPP / đv', 'NPP chào', 'Doanh số MMH cả HĐ', '/ tháng', f'Số tháng trong FY{fyn}', f'Ước tính FY{fyn}'], rows))
        s.append(f'<p class="m">Cách tính: Doanh số MMH cả HĐ = SL theo HSMT × giá MANI bán cho NPP từng mã · chia đều cho hiệu lực hợp đồng {dmo} tháng ⇒ doanh số / tháng · '
                 f'× số tháng còn lại trong FY{fyn} (HĐ giả định bắt đầu {R["start"].strftime("%m/%Y")}, tháng sau mở thầu) ⇒ ước tính FY{fyn}. Tỷ giá cố định {vnd(RATE)} đ/USD. NPP chào = giá dự thầu trong biên bản mở thầu.</p>')
    if mine:
        rows = [[l['code'], H(l['name'][:60]), ', '.join(H(c) for c in l.get('npp_codes', [])) or '—', rank_cell(l), chance(l)] for l in mine]
        s.append('<p><b>Khả năng trúng</b> — ' + (f'giá thấp nhất <b>{len(w1)}/{len(mine)}</b> phần' if mine else '') + (f', cao hơn đối thủ {len(wl)} phần' if wl else '') + '</p>')
        s.append(tbl(['Phần', 'Mặt hàng', 'Mã NPP chào', 'Hạng giá', 'Nhận định'], rows, me=lambda r: 'thấp nhất' in r[4] or 'Duy nhất' in r[4]))
    note = []
    for d in R.get('diff', []): note.append('Lệch dữ liệu: ' + H(d))
    if others: note.append(f'{len(others)} phần MMH đáp ứng được nhưng {H(pk["npp"])} không dự' + (f' ({sum(1 for l in others if "cạnh tranh" in why_not(l))} phần MANI cạnh tranh được về giá)' if any("cạnh tranh" in why_not(l) for l in others) else ''))
    if R['allorig']: note.append(f"HSMT có tiêu chí {H(', '.join(R['allorig']))} — hàng MANI đáp ứng")
    if not R['kytxt']: note.append('Chưa có HSMT – yêu cầu kỹ thuật (cần VNeGP Agent)')
    if note: s.append('<p><b>Cần lưu ý</b></p><ul>' + ''.join(f'<li>{x}</li>' for x in note) + '</ul>')
    s.append('</div>')
    # ── CHI TIẾT
    s.append('<h3>1. Thông tin gói thầu</h3>')
    s.append(tbl(['Mục', 'Nội dung'], [
        ['Giá gói thầu', f"<b>{vnd(R['price'])} đ</b>" if R['price'] else 'Không rõ'],
        ['Số phần / cách chọn', f"<b>{len(R['lots'])} phần</b> · <b>{'theo từng phần' if R['byPart'] else 'cả gói'}</b> · {H(pk['npp'])} dự <b>{len(mine)}</b> phần"],
        ['Thời gian thực hiện hợp đồng', f'<b>{H(dur)}</b>'],
        ['Hình thức', H(' · '.join(x for x in [F['Hình thức lựa chọn nhà thầu'], F['Phương thức lựa chọn nhà thầu']] if x) or 'Không rõ')],
        ['Nguồn vốn · loại hợp đồng', H(' · '.join(x for x in [F['Nguồn vốn'], F['Loại hợp đồng']] if x) or 'Không rõ')],
        ['Bảo đảm dự thầu', H(F['Số tiền đảm bảo dự thầu'] or 'Không rõ')]]))
    s.append(f'<p class="m">{src}</p>')
    s.append('<h3>2. Biên bản mở thầu · các phần NPP dự</h3>')
    rows = []
    for l in mine:
        bs = '<br>'.join(('<b>' if i == l['mine'] else '') + f"{i+1}. {H(b['name'][:55])} — {vnd(b['price'])} đ" + ('</b>' if i == l['mine'] else '') for i, b in enumerate(l['bids'][:6]))
        rows.append([l['code'], H(l['name'][:80]), bs + (f'<br><span class="m">+{len(l["bids"]) - 6} nhà thầu</span>' if len(l['bids']) > 6 else '')])
    s.append(tbl(['Phần', 'Mặt hàng', 'Nhà thầu · giá dự thầu (thấp ⇒ cao)'], rows) if rows else '<p>NPP không dự phần nào.</p>')
    for cid, f, cap in [e for e in R['ev'] if e[0].startswith('bb')]:
        s.append(f'<p class="m">{H(cap)} · khung đỏ = {H(pk["npp"])}</p>' + img(cid, f))
    s.append('<h3>3. Yêu cầu kỹ thuật · mã MANI đáp ứng</h3>')
    shown = mine + others[:25]
    for g in GORDER:
        ls = [l for l in shown if l.get('group') == g]
        if not ls: continue
        s.append(f'<p><b>{H(g)}</b> · {len(ls)} phần</p>')
        rows = [[l['code'], H(l['name'][:90]) + (f'<br><span class="m">SL {vnd(l["qty"])} {H(l.get("unit", ""))}</span>' if l.get('qty') else ''),
                 H(l['level']) + ('<br><span class="m">' + H(', '.join(l['orig'])) + '</span>' if l['orig'] else ''), code_cell(l), status_cell(l)] for l in ls]
        s.append(tbl(['Phần', 'Mặt hàng', 'Thông số', 'Mã MANI · giá tối thiểu BV công', 'NPP'], rows, me=lambda r: '>Dự<' in r[4]))
    if len(others) > 25: s.append(f'<p class="m">+{len(others) - 25} phần MMH khác NPP không dự.</p>')
    s.append('<p class="m">★ = mã NPP chào.</p>')
    for cid, f, cap in [e for e in R['ev'] if e[0].startswith('ky')]:
        s.append(f'<p class="m">{H(cap)}</p>' + img(cid, f))
    bx = [e for e in R['ev'] if e[0].startswith('bx')]
    if bx: s.append('<p><b>Phần NPP không dự</b> · khung đỏ = giá thấp nhất</p>')
    for cid, f, cap in bx:
        s.append(f'<p class="m">{H(cap.split(" (NPP")[0])}</p>' + img(cid, f))
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

STAGE_LAB = {'mo': 'Biên bản mở thầu', 'kq': 'Kết quả lựa chọn nhà thầu', 'wk': 'Tổng hợp tuần', 'tb': 'Thông báo mời thầu'}
def from_name(body):
    """tên người gửi hiện trong hộp thư = (bước thầu) + bệnh viện — người dùng 28/11/2026: không để "Hệ thống Theo dõi thầu" """
    if body.get('fromName'): return body['fromName']
    hosp = re.sub(r'^\s*(Bệnh viện|BV)\s+', 'BV ', str(body.get('hosp') or '').strip())
    return (f"({STAGE_LAB.get(body.get('stage'), 'Thầu')}) {hosp}".strip())[:70]

def notify_send(body, inl, att):
    """gửi qua mmh.notify: máy chủ kiểm + tra người nhận (prep) ⇒ SMTP ⇒ ghi đã gửi (mark).
    v1.3 (28/11/2026, người dùng yêu cầu): CHỈ gửi bằng mmh.notify — lỗi SMTP ⇒ báo lỗi, KHÔNG gửi bằng mmh.product."""
    meta = {k: v for k, v in body.items() if k not in ('html', 'inl', 'att')}
    pr = post(dict(meta, op='prep'), tries=2)
    if not pr.get('ok') or pr.get('skip'):
        log('  gửi (mmh.notify):', json.dumps({k: pr.get(k) for k in ('ok', 'skip', 'error', 'code') if pr.get(k)}, ensure_ascii=False)); return pr
    subj = ('[Xem trước] ' if pr.get('preview') else '[Thử] ' if pr.get('test') else '') + body['subject']
    rep = pr.get('reply') or {}
    if rep.get('subject'): subj = 'Re: ' + rep['subject']
    try:
        mid = NM.send(pr['to'], pr.get('cc') or [], subj, body['html'], inline=inl, attach=att, reply_id=rep.get('msgId') or '', name=from_name(body))
    except Exception as e:
        r = {'ok': False, 'via': 'mmh.notify', 'error': 'SMTP mmh.notify lỗi: ' + str(e)[:300]}
        log('  gửi:', json.dumps(r, ensure_ascii=False)); FAIL.append(body.get('no') or body.get('wk')); return r
    mk = post(dict(meta, op='mark', msgId=mid, subject=body['subject'], replied=1 if rep.get('msgId') else ''), tries=3)
    r = {'ok': True, 'via': 'mmh.notify', 'stage': pr.get('stage'), 'to': ', '.join(pr.get('toNames') or []), 'cc': ', '.join(pr.get('ccNames') or []), 'replied': bool(rep.get('msgId')), 'mark': mk.get('ok')}
    log('  gửi:', json.dumps(r, ensure_ascii=False)); return r

def send(no, stage, subject, html_body, inl, att, R):
    b64 = lambda p: base64.b64encode(open(p, 'rb').read()).decode()
    body = {'action': 'botNpp', 'op': 'send', 'no': no, 'stage': stage, 'subject': subject, 'html': f'<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:14px;color:#1F2A33"><style>{CSS}</style>{html_body}</div>',
            'inl': [{'cid': c, 'name': os.path.basename(f), 'mime': 'image/jpeg', 'b64': b64(f)} for c, f, _ in inl],
            'att': [{'name': os.path.basename(a), 'mime': 'application/pdf', 'b64': b64(a)} for a in att],
            'prov': R['pk']['city'] or R['I'].get('prov', ''), 'text': R['inv'] + ' ' + R['pk']['hospital'], 'mode': 'live' if MODE in ('live', 'test') else 'preview', 'hosp': R['pk']['hospital'] or R['inv']}
    if MODE == 'test': body['testTo'] = TEST_TO
    if FORCE and ONLY: body['force'] = 1
    if MODE == 'dry': log('  (dry) không gửi:', subject); return {'ok': True, 'dry': True}
    if not NM.ready():                               # v1.3: chỉ mmh.notify — thiếu secret NOTIFY_SMTP_PASS ⇒ không gửi
        log('  KHÔNG gửi: thiếu NOTIFY_SMTP_USER / NOTIFY_SMTP_PASS (hộp thư mmh.notify).'); FAIL.append(no); return {'ok': False, 'error': 'thiếu mmh.notify'}
    return notify_send(body, [(c, f) for c, f, _ in inl], att)

def run_mo(pk, hits):
    R, why = build_mo(pk, hits)
    if not R: log('  bỏ qua:', why); return False
    who = to_name(R)
    subj = f"[Thầu] Mở thầu gói thầu – {R['inv'][:80]} – {pk['no']}"
    intro = f"<p>Dear {H(who)},</p><p>Hệ thống Theo dõi thầu thông báo kết quả mở thầu gói có NPP {H(pk['npp'])} tham dự. Bản PDF đính kèm.</p>"
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
    head = (f"<b>{H(pk['npp'])} trúng {len(won)}/{len(rows)} phần · giá trị {usd(tw)} · trong FY{fy}: {usd(cw)}</b>" if won else f"<b>{H(pk['npp'])} không trúng phần nào.</b>")
    b = (f"<p>Dear {H(who)},</p><p>Gói <b>{H(pk['tender'] or pk['no'])}</b> · <b>{H(pk['hospital'])}</b> · {pk['no']} đã có kết quả lựa chọn nhà thầu"
         + (f" ngày {kd.strftime('%d/%m/%Y')}" if k.get('kqDate') else '') + f".</p><p>{head}</p>"
         + tbl(['Phần', 'Nhà thầu trúng · giá trúng', pk['npp'], 'Lý do không trúng'], rows))
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
    sw = os.environ.get('NPP_SWITCH') or ''
    if MODE == 'plan' and sw in ('on', 'off'):           # bật / tắt gửi thật (Script Property NPPM_ON)
        r = post({'action': 'botNpp', 'op': sw}); log(f'Gửi thật: {"BẬT" if r.get("on") else "TẮT"}', '' if r.get('ok') else r.get('error'))
    st = post({'action': 'botNpp', 'op': 'state'}); S = st.get('state') or {}
    log(f'Gói NPP Pending: {len(P)} · đã gửi: {len(S)} · gửi thật: {"bật" if st.get("on") else "tắt"}')
    H = load_hits(set(P))
    todo = []
    for no, pk in sorted(P.items()):
        tgt = os.environ.get('NPP_TARGET') if MODE == 'plan' else MODE
        s = (S.get('_test', {}) if tgt == 'test' else S).get(no, {}); files = [f for h in H.get(no, []) for f in h.get('files', [])]
        has_bb = bool(pick(files, r'biên bản mở thầu') and pick(files, r'nhà thầu tham dự'))
        has_ky = bool(pick(files, r'yêu cầu về kỹ thuật|chương v\b|chuong v|yeu cau ky thuat'))
        has_tb = bool(pick(files, r'thông báo mời thầu'))
        if tgt not in ('live', 'test') or 'mo' not in s or (FORCE and ONLY):
            if has_bb: todo.append((no, 'mo'))
            else: todo.append((no, 'queue'))
            # v1.4: tải ƯU TIÊN tài liệu còn thiếu (TBMT, HSMT Chương V, biên bản mở thầu)
            w = [x for x, ok in (('tbmt', has_tb), ('hsmt', has_ky), ('mo', has_bb)) if not ok]
            if w: QUEUE.append((no, w, 6))
        elif 'kq' not in s:
            todo.append((no, 'kq'))
            if not any(re.search(r'danh sách nhà thầu', f.get('kind', '') + ' ' + f.get('name', ''), re.I) for f in files):
                QUEUE.append((no, ['kq', 'nt', 'hh'], 12))     # kết quả chưa đăng thì 12 giờ mới thử lại
    need = sum(1 for _, t in todo if t in ('mo', 'kq'))
    if (MODE == 'live' or os.environ.get('NPP_TARGET') == 'live') and not st.get('on'):
        log('Gửi thật đang TẮT (botNpp op=on để bật) ⇒ chỉ đặt tải hồ sơ còn thiếu.'); need = 0
        if MODE == 'live': todo = [x for x in todo if x[1] == 'queue']
    log('Việc:', ', '.join(f'{n}:{t}' for n, t in todo) or '(không có)')
    if MODE == 'plan':
        go = os.environ.get('GITHUB_OUTPUT')
        if go: open(go, 'a').write(f'need={1 if need else 0}\n')
        nq = 0
        for no, w, hold in QUEUE:          # v1.4: gói NPP lên ĐẦU hàng đợi tải (info.pri = -1)
            q = {'action': 'botNpp', 'op': 'queue', 'no': no, 'want': ','.join(w), 'hold': hold}
            if ONLY: q.update(pri=-2, force=1)   # gói chọn tay (ô tbmt) ⇒ tải trước cả các gói NPP khác, đặt lại ngay
            r = post(q, tries=2)
            log(f'  {no}: tải ưu tiên {",".join(w)} →', r.get('why') or r.get('error'))
            if r.get('queued'): nq += 1
        if go: open(go, 'a').write(f'queued={nq}\n')
        return
    if MODE in ('live', 'test', 'preview') and not NM.ready():
        log('LỖI: thiếu hộp thư mmh.notify (NOTIFY_SMTP_USER / secret NOTIFY_SMTP_PASS) ⇒ không gửi email nào.'); sys.exit(1)
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
    if FAIL: log('Gửi lỗi:', ', '.join(map(str, FAIL))); sys.exit(1)

if __name__ == '__main__': main()
