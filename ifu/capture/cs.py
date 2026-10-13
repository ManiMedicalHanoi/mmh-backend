import sys,math
from PIL import Image,ImageDraw
out=sys.argv[1]; files=sys.argv[2:]; W=640; cols=3
th=[]
for f in files:
    im=Image.open(f).convert('RGB'); w=W if im.width>im.height else W//2
    th.append((f.split('/')[-1],im.resize((w,int(im.height*w/im.width)))))
rows=math.ceil(len(th)/cols); hs=[max(t[1].height for t in th[r*cols:(r+1)*cols]) for r in range(rows)]
S=Image.new('RGB',(cols*(W+12),sum(h+26 for h in hs)),(90,90,90)); d=ImageDraw.Draw(S); y=0
for r in range(rows):
    for c,(n,im) in enumerate(th[r*cols:(r+1)*cols]):
        S.paste(im,(c*(W+12),y+22)); d.text((c*(W+12)+4,y+5),n,fill='white')
    y+=hs[r]+26
S.save(out,quality=82)
