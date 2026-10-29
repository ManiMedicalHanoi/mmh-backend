"""Write gs2/Mau_Excel.gs = base64 of the template (chunks of 8000 chars). Usage: python3 -I mk_mau.py tpl.xlsx out.gs"""
import sys, base64, hashlib
b = open(sys.argv[1], 'rb').read()
s = base64.b64encode(b).decode()
parts = [s[i:i + 8000] for i in range(0, len(s), 8000)]
with open(sys.argv[2], 'w', encoding='utf-8') as f:
    f.write('/**\n * Mẫu file Excel dự trù cho NPP (.xlsx, mã hoá base64) – dựng bằng build_tpl.py, KHÔNG sửa tay.\n'
            f' * {len(b)} byte · sha1 {hashlib.sha1(b).hexdigest()[:12]}\n */\n')
    f.write('const MAU_EXCEL_B64 = [\n' + ',\n'.join("'" + p + "'" for p in parts) + '\n];\n')
print(len(b), 'bytes ->', len(s), 'b64 chars,', len(parts), 'chunks')
