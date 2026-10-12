import sys,glob,math
from PIL import Image,ImageDraw
files=[f for f in sys.argv[2:]]
out=sys.argv[1]
ims=[]
for f in files:
    im=Image.open(f).convert('RGB')
    if im.width<300: continue
    g=im.convert('L').resize((20,20)); px=list(g.getdata())
    if im.mode=='L' or sum(1 for p in px if p<10)>60 and len(set(im.resize((20,20)).getdata()))<40: continue
    ims.append((f,im))
W=420; cols=4
th=[(f,im.resize((W,int(im.height*W/im.width)))) for f,im in ims]
rows=math.ceil(len(th)/cols); 
hs=[max(t[1].height for t in th[r*cols:(r+1)*cols]) for r in range(rows)]
S=Image.new('RGB',(cols*(W+10),sum(h+24 for h in hs)),'white'); d=ImageDraw.Draw(S)
y=0
for r in range(rows):
    for c,(f,im) in enumerate(th[r*cols:(r+1)*cols]):
        S.paste(im,(c*(W+10),y+20)); d.text((c*(W+10)+2,y+4),f.split('/')[-1],fill='black')
    y+=hs[r]+24
S.save(out,quality=80); print(len(th),S.size)
