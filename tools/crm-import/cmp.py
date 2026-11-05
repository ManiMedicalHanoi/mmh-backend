# So ảnh Zalo (khang-202609/NN.jpg) với ảnh đã có trên Drive (/tmp/drive/<dòng>.jpg) bằng dHash — khoảng cách nhỏ (≤ 10) = cùng 1 ảnh
import glob, os, sys
from PIL import Image
def dh(p, n=16):
    im = Image.open(p).convert('L').resize((n + 1, n), Image.LANCZOS); px = list(im.getdata())
    return [px[r*(n+1)+c] > px[r*(n+1)+c+1] for r in range(n) for c in range(n)]
A = {os.path.basename(p)[:2]: dh(p) for p in sorted(glob.glob(os.path.join(sys.argv[1], '*.jpg')))}
B = {os.path.basename(p)[:-4]: dh(p) for p in sorted(glob.glob('/tmp/drive/*.jpg'))}
for a, ha in A.items():
    d = sorted((sum(x != y for x, y in zip(ha, hb)), b) for b, hb in B.items())
    print(f'ảnh {a}: gần nhất', d[:3])
if not B: print('DỪNG: không tải được ảnh đã có để so'); sys.exit(1)
bad = [a for a, ha in A.items() if B and min(sum(x != y for x, y in zip(ha, hb)) for hb in B.values()) <= 20]
if bad: print('DỪNG: ảnh', bad, 'trùng ảnh đã có trên CRM — không ghi'); sys.exit(1)
print('Không trùng ảnh nào đã có — tiếp tục ghi')
