# Ảnh minh hoạ giả (không phải ảnh thật): phòng khám nha khoa vẽ bằng hình khối
from PIL import Image, ImageDraw, ImageFilter
import random
random.seed(7)
pal=[((222,232,238),(196,205,212),(64,140,170)),((236,229,218),(205,196,182),(70,120,160)),((228,236,230),(190,204,196),(60,150,130)),((238,233,240),(210,200,214),(110,100,170)),((232,236,242),(200,206,216),(52,96,150)),((240,236,226),(214,206,190),(170,110,60))]
for i,(wall,floor,acc) in enumerate(pal*2):
    W,H=1200,900
    im=Image.new('RGB',(W,H),wall); d=ImageDraw.Draw(im)
    d.rectangle([0,int(H*.62),W,H],fill=floor)
    # window
    wx=random.randint(60,700); d.rectangle([wx,90,wx+340,380],fill=(250,252,255),outline=(180,190,200),width=10)
    d.line([wx+170,90,wx+170,380],fill=(180,190,200),width=8); d.line([wx,235,wx+340,235],fill=(180,190,200),width=8)
    # cabinet
    cx=random.choice([40,820]); d.rectangle([cx,360,cx+330,int(H*.62)+60],fill=(245,245,245),outline=(200,200,200),width=4)
    for k in range(3): d.rectangle([cx+15,380+k*75,cx+315,440+k*75],outline=(205,205,205),width=3)
    # chair
    x0=random.randint(330,560)
    d.rounded_rectangle([x0,520,x0+420,600],radius=30,fill=acc)
    d.rounded_rectangle([x0+300,380,x0+380,560],radius=30,fill=acc)
    d.rectangle([x0+180,600,x0+240,720],fill=(150,150,155)); d.ellipse([x0+110,700,x0+310,760],fill=(130,130,135))
    # lamp
    d.line([x0+120,140,x0+120,330],fill=(120,120,125),width=10); d.line([x0+120,330,x0+260,380],fill=(120,120,125),width=10)
    d.ellipse([x0+230,360,x0+320,420],fill=(250,250,235),outline=(140,140,140),width=4)
    # tray with boxes
    d.rectangle([x0-120,470,x0+60,490],fill=(170,170,175))
    for k in range(3): d.rectangle([x0-110+k*58,420,x0-62+k*58,470],fill=[(240,200,60),(80,150,210),(230,90,80)][k])
    im=im.filter(ImageFilter.GaussianBlur(1.2))
    im.save(f'photos/p{i:02d}.jpg',quality=85)
print('ok')
