"""Đọc chữ file tải về (work/raw/<id>__<tên>) ⇒ work/text/<id>.txt.gz + work/text/index.jsonl. Rà soát TT57 (24/11/2026).
PDF: pdftotext; ít chữ (bản scan) ⇒ OCR tesseract tiếng Việt (ocrmypdf). .doc/.rtf/.odt ⇒ LibreOffice. .docx ⇒ đọc XML. .rar/.zip/.7z ⇒ giải nén rồi đọc từng file."""
import gzip, json, os, re, subprocess, sys, tempfile, zipfile, time
RAW, OUT = 'work/raw', 'work/text'
os.makedirs(OUT, exist_ok=True)
T0, BUDGET = time.time(), float(os.environ.get('TT57_TEXT_MIN', '40')) * 60
def run(cmd, t=600):
    try: return subprocess.run(cmd, capture_output=True, timeout=t)
    except Exception as e: return None
def pdf_text(p):
    r = run(['pdftotext', '-layout', p, '-']); t = r.stdout.decode('utf-8', 'ignore') if r and r.returncode == 0 else ''
    pages = 1
    r2 = run(['pdfinfo', p])
    if r2 and r2.returncode == 0:
        m = re.search(rb'Pages:\s+(\d+)', r2.stdout); pages = int(m.group(1)) if m else 1
    how = 'pdftotext'
    if len(t.strip()) < 150 * pages and time.time() - T0 < BUDGET:
        o = p + '.ocr.pdf'
        r3 = run(['ocrmypdf', '-q', '-l', 'vie+eng', '--force-ocr', '--output-type', 'pdf', '--optimize', '0', '--jobs', '4', p, o], 1500)
        if r3 and r3.returncode == 0:
            r4 = run(['pdftotext', '-layout', o, '-']); t2 = r4.stdout.decode('utf-8', 'ignore') if r4 else ''
            if len(t2.strip()) > len(t.strip()): t, how = t2, 'ocr-tesseract'
    return t, how, pages
def docx_text(p):
    with zipfile.ZipFile(p) as z:
        x = z.read('word/document.xml').decode('utf-8', 'ignore')
    x = re.sub(r'</w:p>', '\n', x); x = re.sub(r'<w:tab/>|</w:tc>', ' \t ', x); x = re.sub(r'<[^>]+>', '', x)
    return x.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').replace('&quot;', '"')
def office_text(p):
    d = tempfile.mkdtemp(); r = run(['soffice', '--headless', '--convert-to', 'txt:Text (encoded):UTF8', '--outdir', d, p], 300)
    fs = [f for f in os.listdir(d) if f.endswith('.txt')]
    return open(os.path.join(d, fs[0]), encoding='utf-8', errors='ignore').read() if fs else ''
def read_any(p, depth=0):
    n = p.lower()
    if n.endswith('.pdf'): t, h, _ = pdf_text(p); return t, h
    if n.endswith('.docx'): return docx_text(p), 'docx'
    if re.search(r'\.(doc|rtf|odt)$', n): return office_text(p), 'libreoffice'
    if re.search(r'\.(xlsx?|ods)$', n): return office_text(p) if not n.endswith('x') else '', 'skip-xls'
    if re.search(r'\.(rar|zip|7z)$', n) and depth < 2:
        d = tempfile.mkdtemp(); run(['7z', 'x', '-y', '-o' + d, p], 300)
        parts, hows = [], []
        for root, _, fs in os.walk(d):
            for f in sorted(fs):
                t, h = read_any(os.path.join(root, f), depth + 1)
                if t.strip(): parts.append('\n===== ' + f + ' =====\n' + t); hows.append(h)
        return '\n'.join(parts), 'archive(' + ','.join(sorted(set(hows))) + ')'
    # không có đuôi: đoán theo chữ ký file
    with open(p, 'rb') as fh: sig = fh.read(8)
    if sig.startswith(b'%PDF'): t, h, _ = pdf_text(p); return t, h
    if sig.startswith(b'PK'):
        try: return docx_text(p), 'docx'
        except Exception: pass
    if sig.startswith(b'Rar!') or sig.startswith(b'7z'):
        q = p + ('.rar' if sig.startswith(b'Rar!') else '.7z'); os.rename(p, q); return read_any(q, depth)
    if sig.startswith(b'\xd0\xcf\x11\xe0'): return office_text(p), 'libreoffice'
    return '', 'unknown'
if not os.path.exists(RAW + '/_meta.jsonl'): sys.exit(0)
idx = open(OUT + '/index.jsonl', 'a', encoding='utf-8')
n = 0
for l in open(RAW + '/_meta.jsonl', encoding='utf-8'):
    m = json.loads(l)
    if not m.get('raw'): idx.write(json.dumps(dict(m, how='', chars=0), ensure_ascii=False) + '\n'); continue
    p = os.path.join(RAW, m['raw'])
    try: t, how = read_any(p)
    except Exception as e: t, how = '', 'err:' + str(e)[:200]
    if t.strip():
        with gzip.open(OUT + '/' + m['id'] + '.txt.gz', 'wt', encoding='utf-8') as g: g.write(t)
    idx.write(json.dumps(dict(m, how=how, chars=len(t)), ensure_ascii=False) + '\n'); n += 1
    print(n, how, len(t), m.get('name', '')[:60], flush=True)
idx.close()
