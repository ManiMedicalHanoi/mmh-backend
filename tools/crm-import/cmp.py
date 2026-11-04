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
