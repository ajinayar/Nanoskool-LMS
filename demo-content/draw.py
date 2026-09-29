from PIL import Image, ImageDraw, ImageFont
import math
F="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"; FB="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def f(s,b=False): return ImageFont.truetype(FB if b else F, s)
INK=(29,31,51); IND=(63,61,191); OR=(242,139,48); GR=(46,157,97); RED=(214,69,69); BG=(248,249,253); WIRE=(60,64,90); Y=(255,205,60)
def canvas(w=1200,h=700,title=None):
    im=Image.new("RGB",(w,h),BG); d=ImageDraw.Draw(im)
    if title: d.text((50,36),title,font=f(40,True),fill=INK)
    return im,d
def battery(d,x,y,vert=True,label="Battery"):
    # cell body
    d.rounded_rectangle((x-40,y-70,x+40,y+70),12,fill=(70,70,90))
    d.rounded_rectangle((x-40,y-70,x+40,y-20),12,fill=OR)
    d.rectangle((x-12,y-86,x+12,y-70),fill=(120,120,140))
    d.text((x-10,y-62),"+",font=f(34,True),fill="white"); d.text((x-8,y+22),"−",font=f(34,True),fill="white")
    if label: d.text((x-60,y+84),label,font=f(24),fill=INK)
def bulb(d,x,y,on=True,label="Bulb",r=46):
    if on:
        for k in range(min(6,r//12),0,-1):
            g=max(5,r//6); c=tuple(int(255-(255-v)*k/8) for v in Y); d.ellipse((x-r-k*g,y-r-k*g,x+r+k*g,y+r+k*g),fill=c)
    d.ellipse((x-r,y-r,x+r,y+r),fill=Y if on else (220,220,225),outline=INK,width=3)
    d.rectangle((x-22,y+r-6,x+22,y+r+26),fill=(150,150,165),outline=INK,width=2)
    d.line((x-14,y+8,x-6,y-14,x+2,y+8,x+10,y-14,x+16,y+8),fill=(160,90,20),width=3)
    if label: d.text((x-30,y+r+34),label,font=f(24),fill=INK)
def switch(d,x,y,closed=True,label="Switch"):
    d.ellipse((x-50,y-8,x-34,y+8),fill=INK); d.ellipse((x+34,y-8,x+50,y+8),fill=INK)
    if closed: d.line((x-42,y,x+42,y),fill=INK,width=8)
    else: d.line((x-42,y,x+30,y-50),fill=INK,width=8)
    if label: d.text((x-40,y+22),label,font=f(24),fill=INK)
def arrow(d,x1,y1,x2,y2,c=OR):
    d.line((x1,y1,x2,y2),fill=c,width=5); a=math.atan2(y2-y1,x2-x1)
    p=[(x2,y2),(x2-18*math.cos(a-0.45),y2-18*math.sin(a-0.45)),(x2-18*math.cos(a+0.45),y2-18*math.sin(a+0.45))]; d.polygon(p,fill=c)

# 1 simple circuit
im,d=canvas(title="A simple circuit: a closed loop")
L,T,R,B=220,200,980,560
d.line((L,T,R,T),fill=WIRE,width=8); d.line((R,T,R,B),fill=WIRE,width=8); d.line((R,B,L,B),fill=WIRE,width=8); d.line((L,B,L,T),fill=WIRE,width=8)
d.rectangle((L-44,300,L+44,460),fill=BG); battery(d,L,380,label=None); d.text((L-150,370),"Battery",font=f(26),fill=INK)
d.rectangle((560,T-60,700,T+60),fill=BG); bulb(d,630,T-10,label=None); d.text((720,T-80),"Bulb glows",font=f(26),fill=INK)
d.rectangle((540,B-30,720,B+30),fill=BG); switch(d,630,B,label=None); d.text((575,B+20),"Switch (ON)",font=f(24),fill=INK)
arrow(d,R+40,300,R+40,460); arrow(d,850,B+40,760,B+40); arrow(d,L-40,460,L-40,300) if False else None
d.text((R+10,480),"current",font=f(22),fill=OR)
d.text((50,625),"Electricity flows from the battery, through the wires and the bulb, and back again.",font=f(22),fill=(92,96,121)); d.text((50,655),"Open the switch and the loop breaks, so the bulb goes out.",font=f(22),fill=(92,96,121))
im.save("images/simple-circuit.png")

# 2 conductors vs insulators
im,d=canvas(title="Conductors vs insulators")
cols=[("Conductors — let current flow",GR,["Copper wire","Aluminium foil","Iron nail","Steel spoon","Graphite (pencil lead)","Salt water"]),
      ("Insulators — block current",RED,["Plastic","Rubber","Wood","Glass","Paper","Dry cloth"])]
for i,(h,c,items) in enumerate(cols):
    x=60+i*560
    d.rounded_rectangle((x,120,x+520,640),18,fill="white",outline=c,width=4)
    d.rounded_rectangle((x,120,x+520,190),18,fill=c); d.rectangle((x,170,x+520,190),fill=c)
    d.text((x+24,136),h,font=f(26,True),fill="white")
    for j,t in enumerate(items):
        yy=220+j*68; d.ellipse((x+30,yy+6,x+54,yy+30),fill=c); d.text((x+72,yy),t,font=f(28),fill=INK)
im.save("images/conductors-insulators.png")

# 3 series vs parallel
im,d=canvas(1200,700,"Series vs parallel circuits")
def loop(x0,label,parallel):
    d.text((x0+20,110),label,font=f(30,True),fill=IND)
    if not parallel:
        L,T,R,B=x0+40,220,x0+500,560
        for s in [(L,T,R,T),(R,T,R,B),(R,B,L,B),(L,B,L,T)]: d.line(s,fill=WIRE,width=7)
        d.rectangle((L-44,320,L+44,460),fill=BG); battery(d,L,390,label=None)
        for bx in (x0+190,x0+390): d.rectangle((bx-60,T-60,bx+60,T+60),fill=BG); bulb(d,bx,T-8,label=None,r=38)
        d.text((x0+40,600),"One path. Remove one bulb →",font=f(22),fill=INK); d.text((x0+40,630),"the other goes out too.",font=f(22),fill=INK)
    else:
        L,R,T,B=x0+40,x0+400,220,560
        d.line((L,T,R,T),fill=WIRE,width=7); d.line((L,B,R,B),fill=WIRE,width=7); d.line((L,T,L,B),fill=WIRE,width=7)
        for bx in (x0+220,x0+400):
            d.line((bx,T,bx,B),fill=WIRE,width=7); d.rectangle((bx-50,330,bx+50,450),fill=BG); bulb(d,bx,380,label=None,r=38)
        d.rectangle((L-44,320,L+44,460),fill=BG); battery(d,L,390,label=None)
        d.text((x0+40,600),"Separate paths. Remove one bulb →",font=f(22),fill=INK); d.text((x0+40,630),"the other stays on.",font=f(22),fill=INK)
loop(40,"Series",False); d.line((600,120,600,650),fill=(220,222,235),width=3); loop(630,"Parallel",True)
im.save("images/series-parallel.png")

# 4 circuit symbols
im,d=canvas(title="Circuit symbols")
cells=[("Cell / battery","cell"),("Bulb","bulb"),("Switch (open)","sw"),("Wire","wire"),("Motor","motor"),("Buzzer","buz")]
for i,(name,k) in enumerate(cells):
    cx=110+(i%3)*360; cy=160+(i//3)*260
    d.rounded_rectangle((cx,cy,cx+320,cy+220),16,fill="white",outline=(220,222,235),width=3)
    mx,my=cx+160,cy+90
    if k=="cell": d.line((mx-90,my,mx-14,my),fill=INK,width=4); d.line((mx+14,my,mx+90,my),fill=INK,width=4); d.line((mx-14,my-40,mx-14,my+40),fill=INK,width=5); d.line((mx+14,my-22,mx+14,my+22),fill=INK,width=10)
    if k=="bulb": d.line((mx-90,my,mx-34,my),fill=INK,width=4); d.line((mx+34,my,mx+90,my),fill=INK,width=4); d.ellipse((mx-34,my-34,mx+34,my+34),outline=INK,width=4); d.line((mx-24,my-24,mx+24,my+24),fill=INK,width=4); d.line((mx-24,my+24,mx+24,my-24),fill=INK,width=4)
    if k=="sw": d.line((mx-90,my,mx-40,my),fill=INK,width=4); d.line((mx+40,my,mx+90,my),fill=INK,width=4); d.ellipse((mx-46,my-6,mx-34,my+6),fill=INK); d.ellipse((mx+34,my-6,mx+46,my+6),fill=INK); d.line((mx-40,my,mx+30,my-40),fill=INK,width=4)
    if k=="wire": d.line((mx-100,my,mx+100,my),fill=INK,width=5)
    if k=="motor": d.line((mx-90,my,mx-34,my),fill=INK,width=4); d.line((mx+34,my,mx+90,my),fill=INK,width=4); d.ellipse((mx-34,my-34,mx+34,my+34),outline=INK,width=4); d.text((mx-15,my-22),"M",font=f(36,True),fill=INK)
    if k=="buz": d.line((mx-90,my+10,mx-30,my+10),fill=INK,width=4); d.line((mx+30,my+10,mx+90,my+10),fill=INK,width=4); d.pieslice((mx-40,my-40,mx+40,my+40),180,360,outline=INK,width=4); d.line((mx-40,my,mx+40,my),fill=INK,width=4)
    w=d.textlength(name,font=f(26)); d.text((mx-w/2,cy+160),name,font=f(26),fill=INK)
im.save("images/circuit-symbols.png")

# 5 torch activity
im,d=canvas(title="Activity: build a paper-cup torch")
steps=[("1","Tape a 3 V coin cell between two strips of foil."),("2","Push the bulb (or LED) through the cup's base."),("3","Touch one foil strip to each bulb leg."),("4","Fold a paper clip as an ON/OFF switch."),("5","Shine it! Swap foil for plastic: what happens?")]
for i,(n,t) in enumerate(steps):
    y=130+i*104; d.ellipse((70,y,140,y+70),fill=IND); d.text((93,y+12),n,font=f(38,True),fill="white"); d.text((170,y+18),t,font=f(30),fill=INK)
d.rounded_rectangle((70,660-10,1130,690),8,fill=(255,241,227)); d.text((86,652),"Safety: use small cells only. Never use mains electricity from a wall socket.",font=f(22,True),fill=(170,80,10))
im.save("images/torch-activity.png")

# 6 thumbnail (content kept in the centre so cards and headers can crop it)
im=Image.new("RGB",(1200,800),IND); d=ImageDraw.Draw(im)
for i in range(800): d.line((0,i,1200,i),fill=(int(44+i*0.03),int(42+i*0.04),int(147+i*0.07)))
bulb(d,975,400,label=None,r=80)
d.text((150,300),"Electricity &",font=f(64,True),fill="white"); d.text((150,378),"Simple Circuits",font=f(64,True),fill="white")
d.text((154,466),"Grade 6 · Science",font=f(32),fill=(255,200,150))
im.save("images/thumbnail.png")
print("ok")
