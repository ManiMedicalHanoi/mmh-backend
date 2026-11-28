#!/usr/bin/env python3
"""MMH · TỔNG HỢP THẦU NPP TỪ ĐẦU FY (28/11/2026, người dùng yêu cầu) — npp_fy.py

1 file PDF gộp cả 2 NPP (Hùng Vĩ · iCare — file thầu NPP, tender-hungvi / tender-icare ▸ winMap), cùng cách tính với npp_weekly.py:
  Tóm tắt từng NPP + tổng · 1 Hợp đồng còn hiệu lực (theo địa bàn) · 2 Gói tham dự từ đầu FY hiện tại (trúng / không trúng / chờ kết quả).
Gửi bằng mmh.notify (SMTP) tới 1 người (NPP_TEST_TO, mặc định Giang) — người nhận tra qua botNpp op=prep (testTo, không ghi trạng thái).
Môi trường: WT_BOT_KEY · NPPF_MODE dry|test|live (live = cả team, như tổng hợp tuần) · NPP_TEST_TO.
"""
import os, re, sys, json, datetime, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('NPP_MODE', 'dry')
import npp_weekly as W
N = W.N
MODE = os.environ.get('NPPF_MODE', 'dry')
TO = (os.environ.get('NPP_TEST_TO') or 'Giang').strip()
H, usd, d2, m2, tbl, R_, pname, log = W.H, W.usd, W.d2, W.m2, W.tbl, W.R_, W.pname, W.log
GU, qsum, qadd, qtxt, vnd, ctxt, STAT = W.GU, W.qsum, W.qadd, W.qtxt, W.vnd, W.ctxt, W.STAT
FYC, FYS, TODAY = W.FYC, W.FYS, W.TODAY
NPPS = ('Hùng Vĩ', 'iCare')

def month_of(rows):
    """tháng tham dự từng gói (cột Month của file NPP) — cùng khoá gói với pkgs_of"""
    M = {}
    for r in rows:
        no = W.bare(r.get('tbmt'))
        k = r['_npp'] + '|' + (no if re.match(r'^[A-Z]{2}\d{6,}', no) else W.nk(r.get('hospital')) + '|' + W.nk(r.get('tender')) + '|' + str(r.get('approve') or r.get('month') or ''))
        m = int(r.get('month') or 0)
        if m and m > M.get(k, 0): M[k] = m
    return M

def pdate(p, M):
    d = p['bidClose'] or p['bidOpen'] or p['approve'] or p['signed']
    if d: return d
    m = M.get(p['k'])
    return datetime.date(m // 100, m % 100, 1) if m else None

def status(p):
    n = len(p['rows'])
    if p['win']: return f'<span class="ok">Trúng {len(p["win"])}/{n} mã</span>'
    if p['pend']: return 'Chờ kết quả'
    return '<span class="no">Không trúng</span>'

def main():
    if not N.KEY: log('Thiếu WT_BOT_KEY'); sys.exit(1)
    rows = W.load_rows(); P = W.pkgs_of(rows); M = month_of(rows)
    want = {p['no'] for p in P.values() if p['pend'] and re.match(r'^IB\d', p['no'])}
    hits = N.load_hits(want)
    T = {n: W.build(n, P, hits, None) for n in NPPS}
    # gói tham dự từ đầu FY
    part = {n: sorted([p for p in P.values() if p['npp'] == n and (pdate(p, M) or datetime.date(1900, 1, 1)) >= FYS], key=lambda p: pdate(p, M), reverse=True) for n in NPPS}
    S = {}
    for n in NPPS:
        L = part[n]
        win = [p for p in L if p['win']]; fail = [p for p in L if not p['win'] and not p['pend']]; pend = [p for p in L if not p['win'] and p['pend']]
        S[n] = dict(n=len(L), win=len(win), fail=len(fail), pend=len(pend), fy=T[n]['fy'], act=len(T[n]['act']),
                    winmmh=sum(sum(x['mmh'] for x in p['win']) for p in win),
                    qact=T[n]['qact'], qbid=qadd(*[qsum(p['rows']) for p in L]), qwin=qadd(*[qsum(p['win']) for p in L]))
        log(f'{n}: tham dự FY{FYC} {len(L)} gói · trúng {len(win)} · không trúng {len(fail)} · chờ {len(pend)} · còn hiệu lực {len(T[n]["act"])} · MMH FY {usd(T[n]["fy"])}')
    tot = {k: sum(S[n][k] for n in NPPS) for k in ('n', 'win', 'fail', 'pend', 'fy', 'act', 'winmmh')}
    rate = lambda s: f"{round(s['win'] * 100 / (s['win'] + s['fail']))}%" if (s['win'] + s['fail']) else '—'
    b = []
    head = ['', *NPPS, 'Tổng']
    rws = [['<b>Doanh số MMH ước tính FY%d</b>' % FYC, *[(f"<b>{usd(S[n]['fy'])}</b>",) for n in NPPS], (f"<b>{usd(tot['fy'])}</b>",)],
           ['Hợp đồng còn hiệu lực', *[(str(S[n]['act']),) for n in NPPS], (str(tot['act']),)],
           [f'Gói tham dự từ 09/{FYC + 1958}', *[(str(S[n]['n']),) for n in NPPS], (str(tot['n']),)],
           ['· Trúng', *[(str(S[n]['win']),) for n in NPPS], (str(tot['win']),)],
           ['· Không trúng', *[(str(S[n]['fail']),) for n in NPPS], (str(tot['fail']),)],
           ['· Chờ kết quả', *[(str(S[n]['pend']),) for n in NPPS], (str(tot['pend']),)],
           ['Tỉ lệ trúng (gói đã có KQ)', *[(rate(S[n]),) for n in NPPS], (rate(tot),)]]
    b.append(tbl(head, rws))
    # số lượng theo nhóm (người dùng 28/11/2026): 3 khối, dòng tổng in đậm
    qrows = []
    for key, lab in (('qact', 'Đang cung cấp'), ('qbid', f'Tham dự từ 09/{FYC + 1958}'), ('qwin', f'Trúng từ 09/{FYC + 1958}')):
        qrows.append([f'<b>{lab}</b>', '', '', ''])
        for g in STAT:
            vals = [S[n][key].get(g, 0) for n in NPPS]
            qrows.append([f'<span style="padding-left:14px">{GU[g][0]} ({GU[g][1]})</span>', *[(vnd(v),) for v in vals], (f'<b>{vnd(sum(vals))}</b>',)])
    qhtml = ('<p><b>Số lượng</b></p>' + tbl(['', *NPPS, 'Tổng'], qrows) + '<p class="m">Đang cung cấp = số lượng trúng của các hợp đồng còn hiệu lực.</p>'
             + W.best_html(W.best([x for n in NPPS for x in T[n]['bestp']]), 'Mã bán chạy nhất (đang cung cấp)'))
    b.append(qhtml)
    b.append(f'<p class="m">Doanh số MMH = SL trúng × giá MANI→NPP, chia đều theo hiệu lực hợp đồng, phần rơi vào FY{FYC} (09/{FYC + 1958} – 08/{FYC + 1959}). Tỷ giá {W.vnd(W.RATE)} đ/USD.</p>')
    # 1. còn hiệu lực
    b.append(f'<h3>1. Hợp đồng còn hiệu lực</h3>')
    for t in ('N', 'S', '?'):
        L = sorted([(n, a) for n in NPPS for a in T[n]['act'] if a['p']['terr'] == t], key=lambda x: -x[1]['fy'])
        if not L: continue
        b.append(f'<p><b>{H(W.TNAME[t])}</b> · {len(L)} gói · <b>{usd(sum(a["fy"] for _, a in L))}</b></p>')
        b.append(tbl(['NPP', 'Bệnh viện · gói', 'Tỉnh', 'Mã · SL trúng', 'Hiệu lực', f'FY{FYC}'],
                     [[H(n), pname(a['p']), H(a['p']['city']), ctxt(a['p']['win']), f"{m2(a['p']['start'])} – <b>{m2(N.add_month(a['p']['end'], -1))}</b>", R_(a['fy'])] for n, a in L]))
    # 2. tham dự từ đầu FY
    b.append(f'<h3>2. Gói tham dự từ 09/{FYC + 1958}</h3>')
    for n in NPPS:
        L = part[n]
        b.append(f'<p><b>{H(n)}</b> · {len(L)} gói · trúng {S[n]["win"]} · không trúng {S[n]["fail"]} · chờ {S[n]["pend"]}</p>')
        if not L: b.append('<p>Không có.</p>'); continue
        rows2 = []
        for p in L:
            mmh = sum(x['mmh'] for x in p['win']) if p['win'] else sum(x['mmh'] for x in p['pend'])
            sl = ctxt(p['rows'], mark={(x.get('code') or '').strip() for x in p['win']} if p['win'] and len(p['win']) < len(p['rows']) else None)
            rows2.append([pname(p), H(p['city']), sl, d2(pdate(p, M)) if (p['bidClose'] or p['bidOpen'] or p['approve'] or p['signed']) else m2(pdate(p, M)),
                          status(p), R_(mmh)])
        b.append(tbl(['Bệnh viện · gói', 'Tỉnh', 'Mã · SL tham dự', 'Ngày', 'Kết quả', 'Doanh số MMH cả hợp đồng'], rows2))
    b.append('<p class="m">Ngày = đóng / mở thầu (chưa có thì ngày phê duyệt / tháng trong file NPP). Doanh số MMH cả hợp đồng: gói trúng = phần trúng · gói chờ = nếu trúng.</p>')
    body = ''.join(b)
    title = f'Tổng hợp thầu NPP Hùng Vĩ, iCare · FY{FYC} đến {d2(TODAY)}'
    pdf = N.make_pdf(title, body, os.path.join(W.WORK, f'Tong hop thau NPP FY{FYC} - {TODAY.strftime("%Y%m%d")}.pdf'))
    shutil.copy(pdf, os.path.join(W.OUTD, os.path.basename(pdf)))
    if MODE == 'dry': log('(dry) không gửi'); return
    q = {'action': 'botNpp', 'op': 'prep', 'stage': 'wk', 'wk': W.WK, 'mode': 'live', 'force': 1}
    if MODE != 'live': q['testTo'] = TO          # live = cả team (To PIC địa bàn · CC quản lý, như tổng hợp tuần); không ghi trạng thái
    pr = N.post(q, tries=2)
    if not pr.get('ok') or not pr.get('to'): log('Không tra được người nhận:', pr.get('error')); sys.exit(1)
    if not N.NM.ready(): log('Thiếu hộp thư mmh.notify'); sys.exit(1)
    mail = (f'<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:14px;color:#1F2A33"><style>{N.CSS}</style>'
            f'<p>Dear {H(", ".join(pr.get("toNames") or [TO]))},</p><p>Tổng hợp thầu NPP Hùng Vĩ, iCare từ đầu FY{FYC}. Chi tiết trong PDF đính kèm.</p>{tbl(head, rws)}{qhtml}<p>Trân trọng.</p></div>')
    N.NM.send(pr['to'], pr.get('cc') or [], f'[Thầu] Tổng hợp thầu NPP Hùng Vĩ, iCare – FY{FYC} đến {d2(TODAY)}', mail, attach=[pdf], name=f'(Tổng hợp FY{FYC}) Thầu NPP Hùng Vĩ, iCare')
    log('Đã gửi tới', ', '.join(pr['to']), '· CC', ', '.join(pr.get('cc') or []))

if __name__ == '__main__':
    try: main()
    finally: open(os.path.join(W.OUTD, 'fy-log.txt'), 'w', encoding='utf-8').write('\n'.join(N.LOG))
