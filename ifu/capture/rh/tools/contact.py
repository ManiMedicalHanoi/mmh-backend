import sys, os
from PIL import Image, ImageDraw, ImageFont
# usage: contact.py out.png cols thumbw img1 img2 ...
out, cols, tw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); files=sys.argv[4:]
th=int(tw*0.62)
try: font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
except: font=ImageFont.load_default()
rows=(len(files)+cols-1)//cols
sheet=Image.new('RGB',(cols*(tw+10)+10, rows*(th+30)+10),'white'); d=ImageDraw.Draw(sheet)
for i,f in enumerate(files):
    im=Image.open(f).convert('RGB'); im.thumbnail((tw,th))
    x=10+(i%cols)*(tw+10); y=10+(i//cols)*(th+30)
    sheet.paste(im,(x,y)); d.rectangle([x-1,y-1,x+im.width,y+im.height],outline='#999')
    d.text((x,y+th+4),os.path.basename(f)[:40],fill='black',font=font)
sheet.save(out)
