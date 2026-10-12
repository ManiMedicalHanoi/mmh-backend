import sys,glob,os
from PIL import Image,ImageDraw,ImageFont
app,start,n=sys.argv[1],int(sys.argv[2]),int(sys.argv[3])
fs=sorted(glob.glob(f'/home/claude/ifu/shots/{app}/*.jpg'))[start:start+n]
cols=3; tw,th=760,470
s=Image.new('RGB',(cols*tw,((len(fs)+cols-1)//cols)*(th+26)),'white'); d=ImageDraw.Draw(s)
f=ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Bold.otf',20)
for i,p in enumerate(fs):
    im=Image.open(p).convert('RGB'); im.thumbnail((tw-8,th-8)); x=(i%cols)*tw; y=(i//cols)*(th+26)
    s.paste(im,(x+4,y+4)); d.text((x+6,y+th),os.path.basename(p),fill='red',font=f)
s.save(f'/home/claude/ifu/.cache/cs_{app}_{start}.jpg',quality=72)
print(len(fs))
