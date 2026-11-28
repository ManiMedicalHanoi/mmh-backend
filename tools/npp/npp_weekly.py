#!/usr/bin/env python3
"""MMH · TỔNG HỢP TUẦN GÓI THẦU NPP (28/11/2026, người dùng yêu cầu) — npp_weekly.py

Mỗi NPP 1 file PDF (Hùng Vĩ · iCare — 2 NPP có file thầu, backend tender-hungvi / tender-icare ▸ winMap):
  1 Tóm tắt doanh số MMH (hợp đồng còn hiệu lực: phần FY hiện tại · phần còn lại từ tháng này · FY kế)
  2 Hợp đồng còn hiệu lực theo địa bàn (Viet Ha: miền Bắc → hết Đà Nẵng cũ · Khang: từ Quảng Nam cũ)
  3 Hợp đồng hết hạn trong 6 tháng tới (chuẩn bị gói kế tiếp)
  4 Gói đang chờ kết quả (đã / chưa mở thầu, xếp hạng giá của NPP nếu đã có biên bản)
  5 Kết quả mới trong tuần (ngày phê duyệt trong tuần hoặc kết quả đổi so với tuần trước): từng mã trúng / trượt + lý do
Doanh số MMH = SL trúng × giá MANI→NPP (MMH_Prices.gs); USD tỷ giá cố định 26.000; giá trị chia đều theo số tháng hợp đồng.
1 email / tuần: To Viet Ha + Khang · CC Tuyen, Nguyen Ha, Giang (botNpp op=send stage=wk) — tuần = thứ Bảy → thứ Sáu gần nhất.

Môi trường: WT_BOT_KEY · NPPW_MODE dry|preview|test|live · NPP_TEST_TO (test, mặc định Giang) · NPPW_FORCE=1 gửi lại tuần đã gửi.
"""
import os, re, sys, json, time, html, base64, hashlib, datetime, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('NPP_MODE', 'dry')
import npp_report as N

MODE = os.environ.get('NPPW_MODE', 'dry')
TEST_TO = (os.environ.get('NPP_TEST_TO') or 'Giang').strip()
FORCE = os.environ.get('NPPW_FORCE') == '1'
TODAY = datetime.date.today()
if os.environ.get('NPPW_TODAY'): TODAY = datetime.date.fromisoformat(os.environ['NPPW_TODAY'])
WEND = TODAY - datetime.timedelta(days=(TODAY.weekday() - 4) % 7)      # thứ Sáu gần nhất (hôm nay nếu là thứ Sáu)
WSTART = WEND - datetime.timedelta(days=6)                               # thứ Bảy trước đó
WK = WSTART.isoformat()
OUTD = os.path.join(N.REPO, 'npp-out'); os.makedirs(OUTD, exist_ok=True)
WORK = os.path.join(N.WORK, 'weekly'); os.makedirs(WORK, exist_ok=True)
log, H, vnd, nk, num, bare = N.log, N.H, N.vnd, N.nk, N.num, N.bare
RATE = N.RATE
N.CSS += '\ntable.kp{border-collapse:separate;border-spacing:6px 0;margin:4px -6px 10px}table.kp td{border:1px solid #BCD4E6;border-radius:6px;padding:6px 10px;background:#F7FAFD;vertical-align:top}.kv{font-size:18px;font-weight:bold;color:#2C4A5E}.kl{font-size:12px;color:#6B7785}'
def usd(v): return '$' + f"{v / RATE:,.0f}"
def d2(d): return d.strftime('%d/%m/%Y') if d else ''
def m2(d): return d.strftime('%m/%Y') if d else ''

# ───────────── giá MANI → NPP (kèm quy cách hộp để đổi SL hộp ⇒ cái)
def load_pack():
    s = open(os.path.join(N.REPO, 'backends/crm-surgical/MMH_Prices.gs'), encoding='utf-8').read()
    P = {}
    for code, kind, pack, box, unit, name in re.findall(r'\["([^"]+)", "(dao|chi|ghim)", (\d+), (\d+), (\d+), "([^"]*)"', s):
        P[re.sub(r'[^A-Z0-9]', '', code.upper())] = {'code': code, 'kind': kind, 'pack': int(pack), 'unit': int(unit), 'name': name}
    return P
PR = load_pack()
KIND = {'dao': 'Dao nhãn khoa', 'chi': 'Chỉ khâu', 'ghim': 'Ghim da'}
def price_of(code):
    """mã đúng ⇒ giá; ô nhiều mã ("MSL22SH; MSL28SH", "MSL22SH/ MSL28SH") hoặc mã thiếu đuôi ("MST15") ⇒ giá trung bình các mã khớp"""
    c0 = re.sub(r'[^A-Z0-9]', '', str(code or '').upper())
    if c0 in PR: return PR[c0]
    hit = []
    for part in re.split(r'[;,/&+\s]+|\bVA\b', str(code or '').upper()):
        c = re.sub(r'[^A-Z0-9]', '', part)
        if len(c) < 4: continue
        if c in PR: hit.append(PR[c]); continue
        m = [v for k, v in PR.items() if k.startswith(c)]
        if m: hit.append({'kind': m[0]['kind'], 'pack': m[0]['pack'], 'unit': sum(x['unit'] for x in m) / len(m)})
    if not hit: return None
    return {'kind': hit[0]['kind'], 'pack': hit[0]['pack'], 'unit': sum(x['unit'] for x in hit) / len(hit)}
def kind_guess(code):
    c = re.sub(r'[^A-Z0-9]', '', str(code or '').upper())
    return 'Dao nhãn khoa' if re.match(r'^M[A-Z]{2}\d', c) else 'Chỉ khâu' if re.match(r'^\d{3,4}[A-Z]?$', c) else ''
def pieces(qty, unit, pr):
    if pr and re.search(r'hop|box|vi\b', nk(unit)): return qty * pr['pack']
    return qty

# ───────────── địa bàn (giống wtrTerr_ của tender-info)
TERR_N = ['Hà Nội', 'Bắc Ninh', 'Bắc Giang', 'Quảng Ninh', 'Hải Phòng', 'Hải Dương', 'Hưng Yên', 'Thái Bình', 'Ninh Bình', 'Nam Định', 'Hà Nam',
          'Cao Bằng', 'Tuyên Quang', 'Hà Giang', 'Lào Cai', 'Yên Bái', 'Thái Nguyên', 'Bắc Kạn', 'Lạng Sơn', 'Phú Thọ', 'Vĩnh Phúc', 'Hòa Bình', 'Hoà Bình',
          'Điện Biên', 'Lai Châu', 'Sơn La', 'Thanh Hóa', 'Thanh Hoá', 'Nghệ An', 'Hà Tĩnh', 'Quảng Trị', 'Quảng Bình', 'Huế', 'Thừa Thiên Huế', 'Đà Nẵng']
def pk_(s):
    s = re.sub(r'[^a-z0-9]', '', nk(s))
    s = re.sub(r'^(thanhpho|tp|tinh)', '', s)
    return 'hochiminh' if s in ('hcm', 'tphcm', 'saigon') else s
TN = {pk_(x) for x in TERR_N}
QNAM = re.compile(r'\b(quang nam|tam ky|hoi an|dien ban|duy xuyen|que son|thang binh|nui thanh|phu ninh|dai loc|nong son|hiep duc|tien phuoc|tra my|phuoc son|nam giang|dong giang|tay giang|chu lai)\b')
PROV_IN = [(pk_(x), x) for x in TERR_N + ['Hồ Chí Minh', 'Cần Thơ', 'Đồng Nai', 'Bình Dương', 'Khánh Hòa', 'Quảng Ngãi', 'Bình Định', 'Gia Lai', 'Đắk Lắk', 'Lâm Đồng', 'An Giang', 'Kiên Giang', 'Long An', 'Tiền Giang', 'Vĩnh Long', 'Đồng Tháp', 'Bến Tre', 'Cà Mau', 'Bạc Liêu', 'Sóc Trăng', 'Trà Vinh', 'Hậu Giang', 'Tây Ninh', 'Bình Phước', 'Bà Rịa', 'Vũng Tàu', 'Ninh Thuận', 'Bình Thuận', 'Phú Yên', 'Kon Tum', 'Đắk Nông', 'Quảng Nam']]
def terr(city, text=''):
    k = pk_(city)
    if not k:
        t = re.sub(r'[^a-z0-9]', '', nk(text))
        for kk, _ in PROV_IN:
            if kk and kk in t: k = kk; break
    if not k: return '?'
    if k == 'quangnam': return 'S'
    if k == 'danang': return 'S' if QNAM.search(' ' + nk(text) + ' ') else 'N'
    return 'N' if k in TN else 'S'
TNAME = {'N': 'Viet Ha · miền Bắc → hết Đà Nẵng cũ', 'S': 'Khang · từ Quảng Nam cũ trở vào', '?': 'Chưa rõ tỉnh'}

# ───────────── thời gian / năm tài chính (FY bắt đầu tháng 9; FYxx = năm bắt đầu − 1958)
def mi(d): return d.year * 12 + d.month - 1
def fy_of(d): return (d.year if d.month >= 9 else d.year - 1) - 1958
FYC = fy_of(TODAY)
FYS = datetime.date(FYC + 1958, 9, 1)
def overlap(a0, a1, b0, b1): return max(0, min(a1, b1) - max(a0, b0))      # [a0, a1) ∩ [b0, b1) theo số tháng
def split(value, start, dur):
    """giá trị chia đều theo tháng hợp đồng ⇒ (FY hiện tại, còn lại từ tháng này đến hết FY, FY kế)"""
    s0 = mi(start); s1 = s0 + dur; f0 = mi(FYS); f1 = f0 + 12; t0 = mi(TODAY)
    per = value / dur if dur else 0
    return per * overlap(s0, s1, f0, f1), per * overlap(s0, s1, max(t0, f0), f1), per * overlap(s0, s1, f1, f1 + 12)

# ───────────── dữ liệu NPP
def load_rows():
    frm = str(N.month_back(40))
    out = []
    for key, npp in (('tender-hungvi', 'Hùng Vĩ'), ('tender-icare', 'iCare')):
        j = N.get_json(N.B[key]['url'] + '?action=winMap&from=' + frm)
        rows = j.get('rows') or []
        log(f'{npp}: {len(rows)} dòng thầu từ {frm}')
        for r in rows: r['_npp'] = npp
        out += rows
    return out
def pkgs_of(rows):
    P = {}
    for r in rows:
        no = bare(r.get('tbmt'))
        k = r['_npp'] + '|' + (no if re.match(r'^[A-Z]{2}\d{6,}', no) else nk(r.get('hospital')) + '|' + nk(r.get('tender')) + '|' + str(r.get('approve') or r.get('month') or ''))
        p = P.setdefault(k, {'k': k, 'no': no, 'npp': r['_npp'], 'hospital': r.get('hospital') or '', 'city': r.get('city') or '', 'tender': r.get('tender') or '',
                             'approve': N.dparse(r.get('approve')), 'signed': N.dparse(r.get('signed')), 'dur': int(r.get('dur') or 12), 'durRaw': r.get('durRaw') or '',
                             'bidOpen': N.dparse(r.get('bidOpen')), 'bidClose': N.dparse(r.get('bidClose')), 'link': r.get('link') or '', 'rows': []})
        for f in ('approve', 'signed', 'bidOpen', 'bidClose'):
            if not p[f]: p[f] = N.dparse(r.get(f))
        pr = price_of(r.get('pcode'))
        res = str(r.get('result') or '')
        qty = num(r.get('wonQty')) if res == 'Win' and num(r.get('wonQty')) else num(r.get('qty'))
        bidv = num(r.get('total')) if res == 'Win' and num(r.get('total')) else qty * (num(r.get('wonPrice')) if res == 'Win' and num(r.get('wonPrice')) else num(r.get('price')))
        pcs = pieces(qty, r.get('unit') or '', pr)
        p['rows'].append({'code': str(r.get('pcode') or '').strip(), 'res': res, 'qty': qty, 'unit': r.get('unit') or '', 'price': num(r.get('price')),
                          'bid': bidv, 'mmh': pcs * pr['unit'] if pr else 0, 'kind': KIND.get(pr['kind']) if pr else kind_guess(r.get('pcode')), 'note': r.get('note') or ''})
    for p in P.values():
        p['terr'] = terr(p['city'], p['hospital'] + ' ' + p['tender'])
        p['win'] = [x for x in p['rows'] if x['res'] == 'Win']
        p['fail'] = [x for x in p['rows'] if x['res'] in ('Fail', 'Cancel')]
        p['pend'] = [x for x in p['rows'] if x['res'] in ('', 'Pending')]
        p['kinds'] = ', '.join(sorted({x['kind'] for x in p['rows'] if x['kind']})) or '—'
        st = p['signed'] or (N.add_month(p['approve'], 1) if p['approve'] else None)
        p['start'] = datetime.date(st.year, st.month, 1) if st else None
        p['end'] = N.add_month(p['start'], p['dur']) if p['start'] else None        # tháng đầu tiên SAU hợp đồng
        p['sig'] = hashlib.md5('|'.join(sorted(f"{x['code']}:{x['res']}" for x in p['rows'])).encode()).hexdigest()[:4]
    return P

def hk_(k): return hashlib.md5(k.encode()).hexdigest()[:7]

# ───────────── kết quả + lý do (file tổng Danh sách nhà thầu của tender-info)
def reasons(p):
    if not re.match(r'^IB\d', p['no']): return {}
    k = N.post({'action': 'botNpp', 'op': 'kq', 'no': p['no']}, tries=2)
    if not k.get('ok') or not k.get('lots'): return {}
    npre = N.NPPRE[p['npp']]; out = {}
    for lot, ents in k['lots'].items():
        me = [e for e in ents if re.search(npre, nk(e[0]))]
        if not me: continue
        w = [e for e in ents if e[3]]
        out[lot.upper()] = {'me': me[0], 'win': w}
    return out

# ───────────── xếp hạng giá trong biên bản mở thầu (nếu đã tải)
def ranks(p, hits):
    files = [f for h in hits.get(p['no'], []) for f in h.get('files', [])]
    f_nt = N.pick(files, r'nhà thầu tham dự')
    has_bb = bool(N.pick(files, r'biên bản mở thầu'))
    if not f_nt: return has_bb, None
    try: lots = N.read_bidders(f_nt)
    except Exception as e: log('  đọc bảng nhà thầu lỗi:', e); return has_bb, None
    npre = N.NPPRE[p['npp']]; out = []
    for l in lots or []:
        bs = l.get('bids') or []
        mine = [i for i, b in enumerate(bs) if re.search(npre, nk(b.get('name')))]
        if mine: out.append((l.get('code') or '', mine[0] + 1, len(bs)))
    return True, out

# ───────────── trình bày
def tbl(head, rows, foot=None):
    h = ''.join(f'<th>{H(c)}</th>' for c in head)
    def cell(c):
        if isinstance(c, tuple): return f'<td class="r">{c[0]}</td>'
        c = str(c); return f'<td>{c if re.search(r"<(br|span|b|a)\b", c) else H(c)}</td>'
    b = ''.join('<tr>' + ''.join(cell(c) for c in r) + '</tr>' for r in rows)
    f = ('<tr class="me">' + ''.join(cell(c) for c in foot) + '</tr>') if foot else ''
    return f'<table class="t"><tr>{h}</tr>{b}{f}</table>'
R_ = lambda v: (usd(v) if v else '—',)
def pname(p):
    t = H(p['hospital'][:70]) + (f'<br><span class="m">{H(p["tender"][:90])}</span>' if p['tender'] else '')
    return t + (f'<br><span class="m">{H(p["no"])}</span>' if p['no'] else '')

def build(npp, P, hits, seen):
    A = [p for p in P.values() if p['npp'] == npp]
    T = {}
    m0 = datetime.date(TODAY.year, TODAY.month, 1)
    # hợp đồng có phần nằm trong FY hiện tại (còn hiệu lực + đã hết trong FY)
    fyc = []
    for p in A:
        if not p['win'] or not p['start'] or p['end'] <= FYS: continue
        mmh = sum(x['mmh'] for x in p['win']); bidv = sum(x['bid'] for x in p['win'])
        fy, _, _ = split(mmh, p['start'], p['dur'])
        if fy <= 0 and p['start'] >= N.add_month(FYS, 12): continue
        fyc.append(dict(p=p, mmh=mmh, bid=bidv, fy=fy, live=p['end'] > m0))
    fyc.sort(key=lambda a: -a['fy'])
    T['fyc'] = fyc; T['act'] = [a for a in fyc if a['live']]; T['gone'] = [a for a in fyc if not a['live']]
    T['nodate'] = [p for p in A if p['win'] and not p['start'] and (p['approve'] or p['bidOpen'] or TODAY) >= N.add_month(TODAY, -24)]
    T['exp'] = sorted([a for a in T['act'] if a['p']['end'] <= N.add_month(m0, 6)], key=lambda a: a['p']['end'])
    T['newfy'] = [a for a in fyc if a['p']['approve'] and a['p']['approve'] >= FYS]
    # đang chờ kết quả
    pend = [p for p in A if p['pend'] and not p['win'] and not p['approve'] and (p['bidClose'] or p['bidOpen'] or TODAY) >= N.add_month(TODAY, -8)]
    pend.sort(key=lambda p: p['bidClose'] or p['bidOpen'] or TODAY)
    prow = []
    for p in pend:
        opened, rk = ranks(p, hits) if re.match(r'^IB\d', p['no']) else (False, None)
        mmh = sum(x['mmh'] for x in p['pend'])
        if rk:
            first = sum(1 for _, r, n in rk if r == 1)
            st = f'<b>Đã mở thầu</b> · giá thấp nhất <b>{first}/{len(rk)}</b> phần'
        elif opened: st = '<b>Đã mở thầu</b>'
        else: st = 'Chưa mở thầu' + (f' · đóng thầu {d2(p["bidClose"])}' if p['bidClose'] else '')
        prow.append(dict(p=p, st=st, mmh=mmh, first=(sum(1 for _, r, n in rk if r == 1) if rk else 0)))
    T['pend'] = prow
    # kết quả mới trong tuần
    newd = []
    for p in A:
        if not (p['win'] or p['fail']): continue
        hk = hk_(p['k'])
        inweek = p['approve'] and WSTART <= p['approve'] <= WEND
        changed = seen is not None and hk in seen and seen[hk] != p['sig']
        fresh = seen is not None and hk not in seen and p['approve'] and p['approve'] >= WSTART - datetime.timedelta(days=21)
        if not (inweek or changed or fresh): continue
        mmh = sum(x['mmh'] for x in p['win']); fy = split(mmh, p['start'], p['dur'])[0] if p['start'] and mmh else 0
        newd.append(dict(p=p, rs=reasons(p), mmh=mmh, fy=fy))
    newd.sort(key=lambda x: x['p']['approve'] or TODAY, reverse=True)
    T['new'] = newd
    T['fy'] = sum(a['fy'] for a in fyc)
    return T

def kpis(T):
    return [('Doanh số MMH ước tính FY%d theo hiệu lực HĐ (09/%d – 08/%d)' % (FYC, FYC + 1958, FYC + 1959), usd(T['fy'])), ('Gói còn hiệu lực', str(len(T['act']))), ('Hết hạn ≤ 6 tháng', str(len(T['exp']))),
            ('Gói trúng mới FY%d' % FYC, str(len(T['newfy']))), ('Đang chờ kết quả', str(len(T['pend']))), ('Kết quả mới trong tuần', str(len(T['new'])))]
def kpi_html(K):
    return '<table class="kp"><tr>' + ''.join(f'<td><div class="kv">{H(v)}</div><div class="kl">{H(k)}</div></td>' for k, v in K) + '</tr></table>'

def notes(npp, T, n=6):
    out = []
    for x in T['new']:
        p = x['p']; out.append(f'<b>{H(p["hospital"][:60])}</b>: có kết quả, trúng <b>{len(p["win"])}/{len(p["rows"])}</b> mã' + (f' · ước tính FY{FYC} <b>{usd(x["fy"])}</b>' if x['fy'] else ''))
    for x in T['pend']:
        if x['first']: out.append(f'<b>{H(x["p"]["hospital"][:60])}</b>: đã mở thầu, giá thấp nhất {x["first"]} phần' + (f' · ước tính nếu trúng <b>{usd(x["mmh"])}</b>' if x['mmh'] else ''))
    for a in T['exp'][:4]:
        out.append(f'<b>{H(a["p"]["hospital"][:60])}</b>: hết hạn <b>{m2(N.add_month(a["p"]["end"], -1))}</b>' + (f' · ước tính {usd(a["mmh"] / a["p"]["dur"])}/tháng' if a['mmh'] else ''))
    return out[:n]

def html_npp(npp, T, for_pdf=False):
    b = [kpi_html(kpis(T))]
    nt = notes(npp, T, 10)
    if nt: b.append('<p><b>Cần chú ý</b></p><ul>' + ''.join(f'<li>{x}</li>' for x in nt) + '</ul>')
    b.append(f'<h3>1. Hợp đồng còn hiệu lực · doanh số ước tính FY{FYC} theo hiệu lực HĐ</h3>')
    for t in ('N', 'S', '?'):
        L = [a for a in T['act'] if a['p']['terr'] == t]
        if not L: continue
        rows = [[pname(a['p']), H(a['p']['city']), H(a['p']['kinds']), f"{m2(a['p']['start'])} – <b>{m2(N.add_month(a['p']['end'], -1))}</b>", R_(a['fy'])] for a in L]
        b.append(f'<p><b>{H(TNAME[t])}</b> · {len(L)} gói · <b>{usd(sum(a["fy"] for a in L))}</b></p>')
        b.append(tbl(['Bệnh viện · gói', 'Tỉnh', 'Nhóm SP', 'Hiệu lực', f'Ước tính FY{FYC}'], rows))
    if not T['act']: b.append('<p>Không có.</p>')
    if T['gone']:
        b.append(f'<p class="m">Hợp đồng đã hết hạn trong FY{FYC} (đã tính vào doanh số FY{FYC}): ' + '; '.join(f'{H(a["p"]["hospital"][:40])} {usd(a["fy"])}' for a in T['gone'][:12]) + ('…' if len(T['gone']) > 12 else '') + '</p>')
    if T['nodate']: b.append(f'<p class="m">{len(T["nodate"])} gói trúng thiếu ngày phê duyệt / ngày ký trong file NPP — chưa tính: ' + ', '.join(H(p['hospital'][:40]) for p in T['nodate'][:10]) + ('…' if len(T['nodate']) > 10 else '') + '</p>')
    b.append('<h3>2. Hết hạn trong 6 tháng tới</h3>')
    b.append(tbl(['Bệnh viện · gói', 'Địa bàn', 'Hết hạn', 'Nhóm SP', 'Ước tính / tháng'], [[pname(a['p']), H(TNAME[a['p']['terr']].split(' ·')[0]), f"<b>{m2(N.add_month(a['p']['end'], -1))}</b>", H(a['p']['kinds']), R_(a['mmh'] / a['p']['dur'])] for a in T['exp']]) if T['exp'] else '<p>Không có.</p>')
    b.append('<h3>3. Đang chờ kết quả</h3>')
    b.append(tbl(['Bệnh viện · gói', 'Địa bàn', 'Tình trạng', 'Ước tính nếu trúng'], [[pname(x['p']), H(TNAME[x['p']['terr']].split(' ·')[0]), x['st'], R_(x['mmh'])] for x in T['pend']]) if T['pend'] else '<p>Không có.</p>')
    b.append(f'<h3>4. Kết quả mới tuần {d2(WSTART)} – {d2(WEND)}</h3>')
    if not T['new']: b.append('<p>Không có.</p>')
    for x in T['new']:
        p = x['p']
        b.append(f'<p><b>{H(p["hospital"])}</b> · {H(p["tender"][:90])} · {H(p["no"])}' + (f' · phê duyệt {d2(p["approve"])}' if p['approve'] else '') +
                 f'<br>Trúng <b>{len(p["win"])}/{len(p["rows"])}</b> mã' + (f' · ước tính FY{FYC} <b>{usd(x["fy"])}</b>' if x['fy'] else '') + '</p>')
        rows = []
        for r in p['win'] + p['fail'] + p['pend']:
            why = r['note']
            if r['res'] != 'Win' and x['rs'] and not why:
                lotr = [v for v in x['rs'].values() if not v['me'][3]]
                if len(lotr) == 1: why = lotr[0]['me'][2]
            rows.append([H(r['code']), H(r['kind']), (vnd(r['qty']),), '<span class="ok">Trúng</span>' if r['res'] == 'Win' else ('<span class="no">Không trúng</span>' if r['res'] == 'Fail' else H(r['res'] or 'Chờ')), H(why[:120])])
        b.append(tbl(['Mã', 'Nhóm SP', 'SL', 'Kết quả', 'Lý do'], rows))
        if x['rs']:
            lr = [[H(lot), '<span class="ok">Trúng</span>' if v['me'][3] else '<span class="no">Không trúng</span>', '<br>'.join(H(e[0][:45]) for e in v['win']) or '—', H(v['me'][2]) if not v['me'][3] else ''] for lot, v in x['rs'].items()]
            b.append(tbl(['Phần', npp, 'Nhà thầu trúng', 'Lý do'], lr))
    return ''.join(b)

def main():
    if not N.KEY: log('Thiếu WT_BOT_KEY'); sys.exit(1)
    log(f'Tuần {WSTART} → {WEND} · FY{FYC} · chế độ {MODE}')
    st = N.post({'action': 'botNpp', 'op': 'wkstate', 'wk': WK, 'test': TEST_TO if MODE == 'test' else ''})
    if MODE in ('live', 'test') and st.get('sent') and not FORCE: log('Tuần này đã gửi lúc', st['sent'].get('at'), '⇒ bỏ qua'); return
    seen = None                       # {mã gói rút gọn: dấu kết quả} của lần gửi thật trước (None = chưa có)
    if st.get('seen'): seen = dict(x.split(':', 1) for x in st['seen'].split(',') if ':' in x)
    P = pkgs_of(load_rows())
    want = {p['no'] for p in P.values() if p['pend'] and re.match(r'^IB\d', p['no'])}
    hits = N.load_hits(want)
    pdfs, sums, parts = [], [], []
    for npp in ('Hùng Vĩ', 'iCare'):
        T = build(npp, P, hits, seen)
        log(f'{npp}: MMH FY{FYC} {usd(T["fy"])} · hiệu lực {len(T["act"])} · hết hạn 6 tháng {len(T["exp"])} · trúng mới FY {len(T["newfy"])} · chờ KQ {len(T["pend"])} · KQ mới {len(T["new"])}')
        if os.environ.get('NPPW_DEBUG'):
            wr = [x for a in T['fyc'] for x in a['p']['win']]
            log(f'  dòng trúng {len(wr)} · không có giá MANI→NPP {sum(1 for x in wr if not x["mmh"])} · đơn vị: ' + json.dumps(dict(__import__('collections').Counter(x['unit'] for x in wr)), ensure_ascii=False))
            for a in T['fyc']:
                p = a['p']; log(f"FYROW|{npp}|{p['hospital']}|{p['no']}|{p['city']}|{p['kinds']}|{d2(p['approve'])}|{m2(p['start'])}|{m2(N.add_month(p['end'], -1))}|{p['dur']}|{round(a['mmh'])}|{round(a['fy'])}|{'còn' if a['live'] else 'hết'}")
        body = html_npp(npp, T, True)
        safe = 'HungVi' if npp == 'Hùng Vĩ' else 'iCare'
        pdf = N.make_pdf(f'Tổng hợp gói thầu {npp} · tuần {d2(WSTART)} – {d2(WEND)}', body, os.path.join(WORK, f'Tong hop thau {safe} - tuan {WSTART.strftime("%Y%m%d")}.pdf'))
        shutil.copy(pdf, os.path.join(OUTD, os.path.basename(pdf)))
        pdfs.append(pdf); parts.append((npp, T))
    K = [kpis(T) for _, T in parts]
    tot = {'fy': sum(T['fy'] for _, T in parts)}
    rows = []
    for i, (lab, _) in enumerate(K[0]):
        vals = [k[i][1] for k in K]
        sm = usd(tot['fy']) if i == 0 else str(sum(int(v) for v in vals))
        rows.append([f'<b>{H(lab)}</b>' if i == 0 else H(lab)] + [(f'<b>{v}</b>' if i == 0 else v,) for v in vals] + [(f'<b>{sm}</b>',)])
    hl = []
    for npp, T in parts: hl += [f'{H(npp)} · {x}' for x in notes(npp, T, 6)]
    body = (f'<p>Dear Viet Ha, Khang,</p><p>Hệ thống Theo dõi thầu thông báo tổng hợp gói thầu NPP tuần {d2(WSTART)} – {d2(WEND)}. Mỗi NPP 1 file PDF đính kèm.</p>'
            + tbl(['Chỉ số', 'Hùng Vĩ', 'iCare', 'Tổng'], rows)
            + (f'<p><b>Cần chú ý</b></p><ul>{"".join(f"<li>{x}</li>" for x in hl)}</ul>' if hl else '')
            + '<p>Trân trọng,<br>Hệ thống Theo dõi thầu MMH</p>')
    open(os.path.join(OUTD, f'weekly {WK} - email.html'), 'w', encoding='utf-8').write(body)
    subj = f'[Thầu] Tổng hợp tuần gói thầu NPP Hùng Vĩ, iCare – {WSTART.strftime("%d/%m")} – {d2(WEND)}'
    if MODE == 'dry': log('(dry) không gửi:', subj); return
    b64 = lambda f: base64.b64encode(open(f, 'rb').read()).decode()
    req = {'action': 'botNpp', 'op': 'send', 'stage': 'wk', 'wk': WK, 'subject': subj, 'mode': 'live' if MODE in ('live', 'test') else 'preview',
           'html': f'<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:14px;color:#1F2A33"><style>{N.CSS}</style>{body}</div>',
           'att': [{'name': os.path.basename(f), 'mime': 'application/pdf', 'b64': b64(f)} for f in pdfs], 'force': 1 if FORCE else ''}
    if MODE == 'test': req['testTo'] = TEST_TO
    if MODE == 'live': req['seen'] = ','.join(f"{hk_(p['k'])}:{p['sig']}" for p in P.values() if p['win'] or p['fail'])
    r = N.post(req, tries=2)
    log('gửi:', json.dumps({k: r.get(k) for k in ('ok', 'to', 'cc', 'skip', 'error', 'code', 'seen')}, ensure_ascii=False))

if __name__ == '__main__':
    try: main()
    finally: open(os.path.join(OUTD, 'weekly-log.txt'), 'w', encoding='utf-8').write('\n'.join(N.LOG))
