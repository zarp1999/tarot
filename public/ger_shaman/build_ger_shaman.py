import bpy, math, random, os
from mathutils import Vector
random.seed(14)
OUT=os.path.abspath('outputs'); os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(n,c,metal=0,rough=.5):
 m=bpy.data.materials.new(n); m.diffuse_color=(*c,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*c,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
 return m
wood=mat('Walnut | aged warm timber',(.105,.041,.023),0,.45)
gold=mat('Antique brass',(.52,.29,.075),.72,.3)
cloth=mat('Burgundy woven velvet',(.23,.012,.036),0,.86)
felt=mat('Ger ivory felt',(.29,.235,.17),0,.95)
dark=mat('Midnight blue card backs',(.012,.026,.065),.15,.4)
paper=mat('Tarot parchment',(.73,.58,.32),0,.75)
black=mat('Dark iron',(.022,.017,.025),.65,.4)
wax=mat('Beeswax',(.72,.49,.23),0,.65)
purple=mat('Polished amethyst crystal',(.095,.013,.21),.65,.12)
def finish(o,n,m):
 o.name=n; o.data.materials.append(m); return o
def cube(n,loc,scale,m,bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.dimensions=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); finish(o,n,m)
 if bevel: mod=o.modifiers.new('Soft crafted edges','BEVEL'); mod.width=bevel; mod.segments=2; o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def cyl(n,loc,r,depth,m,verts=32):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=depth,location=loc); return finish(bpy.context.object,n,m)
def ball(n,loc,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=loc); o=bpy.context.object; o.scale=scale; finish(o,n,m)
 for p in o.data.polygons:p.use_smooth=True
 return o
def rod(n,a,b,r,m):
 a,b=Vector(a),Vector(b); o=cyl(n,(a+b)/2,r,(b-a).length,m,12); o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler(); return o
def torus(n,loc,major,minor,m):
 bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=48,minor_segments=8,location=loc);return finish(bpy.context.object,n,m)

OUT=os.path.abspath('outputs/ger_shaman');os.makedirs(OUT,exist_ok=True)
random.seed(29)
def group(name):
 c=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(c);return c
current=group('01_Ger_Architecture')
oldfinish=finish
def finish(o,n,m):
 oldfinish(o,n,m)
 for c in list(o.users_collection):c.objects.unlink(o)
 current.objects.link(o);return o
def path(n,pts,r,m):
 d=bpy.data.curves.new(n,'CURVE');d.dimensions='3D';d.resolution_u=1;d.bevel_depth=r;d.bevel_resolution=2
 s=d.splines.new('POLY');s.points.add(len(pts)-1)
 for p,co in zip(s.points,pts):p.co=(*co,1)
 o=bpy.data.objects.new(n,d);current.objects.link(o);o.data.materials.append(m);return o
def surface(n,verts,faces,m):
 d=bpy.data.meshes.new(n);d.from_pydata(verts,[],faces);d.update();o=bpy.data.objects.new(n,d);current.objects.link(o);o.data.materials.append(m)
 for p in d.polygons:p.use_smooth=True
 return o
def lathe(n,rings,m,N=64,center=(0,0,0),fold=0):
 vs=[];fs=[]
 for k,(r,z) in enumerate(rings):
  for j in range(N):
   a=math.tau*j/N;rr=r+fold*math.sin(a*15+k*.2);vs.append((center[0]+rr*math.cos(a),center[1]+rr*math.sin(a),center[2]+z))
 for k in range(len(rings)-1):
  for j in range(N):a=k*N+j;b=k*N+(j+1)%N;fs.append((a,b,b+N,a+N))
 return surface(n,vs,fs,m)
tan=mat('Ochre felt',(.39,.30,.19),0,.91);ivory=mat('Natural linen',(.64,.55,.39),0,.95)
leather=mat('Shaman weathered leather',(.12,.076,.043),0,.87)
fur=mat('Warm fur',(.29,.24,.17),0,.98);feather=mat('Raven feathers',(.035,.030,.024),0,.69)
red=mat('Oxide red',(.27,.043,.025),0,.8);blue=mat('Indigo textile',(.028,.10,.15),0,.9)
stone=mat('Foundation stone',(.20,.19,.15),0,.96);skin=mat('Hands',(.36,.21,.12),0,.73)
# Fine bump on woven and wooden surfaces for Blender; simple PBR colors also export.
for m in [wood,tan,ivory,leather,cloth,fur]:
 nt=m.node_tree;p=nt.nodes.get('Principled BSDF');noise=nt.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=85 if m!=wood else 12
 bump=nt.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.24;bump.inputs['Distance'].default_value=.018
 nt.links.new(noise.outputs['Fac'],bump.inputs['Height']);nt.links.new(bump.outputs['Normal'],p.inputs['Normal'])
# Foundation, plank deck and steps.
cyl('Stone circular foundation',(0,0,-.19),3.65,.34,stone,96)
for i in range(31):
 x=(i-15)*.225;length=2*math.sqrt(max(.01,3.49**2-x*x));cube('Wood floor plank',(x,0,.0),(.217,length,.08),wood,.008)
for i in range(3):cube('Entrance step',(0,-3.64-i*.32,-.05-i*.09),(1.5,.39,.10),wood,.015)
# Complete shell with doorway cutout, outer trim and repeating scroll ornaments.
R=3.3
for i in range(96):
 a=math.tau*i/96
 if math.sin(a)<0 and abs(math.cos(a)*R)<.60:continue
 o=cube('Exterior felt panel',(R*math.cos(a),R*math.sin(a),1.18),(.225,.08,2.28),tan,.01);o.rotation_euler.z=a+math.pi/2
 for z,h in [(.28,.23),(1.03,.22),(2.17,.24)]:
  o=cube('Ivory woven encircling band',((R+.055)*math.cos(a),(R+.055)*math.sin(a),z),(.225,.018,h),ivory,.003);o.rotation_euler.z=a+math.pi/2
 for z in [.14,1.17,2.02,2.32]:
  rod('Exterior binding rope',((R+.07)*math.cos(a-.033),(R+.07)*math.sin(a-.033),z),((R+.07)*math.cos(a+.033),(R+.07)*math.sin(a+.033),z),.016,wood)
for k in range(40):
 a=math.tau*k/40
 if math.sin(a)<0 and abs(math.cos(a)*R)<.65:continue
 for z in [.28,1.03,2.17]:
  pts=[]
  for j in range(40):
   t=j/39*math.pi*3;rad=.075*j/39;u=rad*math.cos(t);zz=rad*math.sin(t)
   pts.append(((R+.07)*math.cos(a+u/R),(R+.07)*math.sin(a+u/R),z+zz))
  path('Woven spiral ornament',pts,.009,leather)
# Sloping felt roof with crown opening.
lathe('Conical felt roof',[(3.40,2.34),(3.17,2.52),(2.55,2.85),(1.8,3.26),(.82,3.83),(.63,3.94)],tan,128)
for j in range(48):
 a=math.tau*j/48
 rod('Interior roof rafter',(3.23*math.cos(a),3.23*math.sin(a),2.30),(.62*math.cos(a),.62*math.sin(a),3.9),.033,wood)
 if j%4==0:path('Roof exterior seam',[(3.40*math.cos(a),3.40*math.sin(a),2.36),(2.55*math.cos(a),2.55*math.sin(a),2.88),(.65*math.cos(a),.65*math.sin(a),3.97)],.018,ivory)
for z,r in [(2.32,3.28),(3.92,.65),(4.15,.46)]:torus('Roof crown ring',(0,0,z),r,.065,wood)
for j in range(12):
 a=math.tau*j/12;rod('Crown vent ribs',(.65*math.cos(a),.65*math.sin(a),3.94),(.43*math.cos(a),.43*math.sin(a),4.15),.022,wood)
lathe('Crown cap',[(.52,4.14),(.38,4.36),(.12,4.47),(0,4.48)],tan)
for x in [-.65,.65]:cube('Door frame',(x,-3.24,1.13),(.13,.18,2.22),wood)
cube('Door lintel',(0,-3.24,2.24),(1.43,.20,.16),wood)
door=cube('Open carved door',(-.94,-3.53,1.10),(.97,.08,2.10),wood);door.rotation_euler.z=-.8
for j in range(7):
 z=.3+j*.25;ball('Door brass stud',(-.94,-3.59,z),(.022,.018,.022),gold)
# Lattice is visible between wall hangings.
for j in range(80):
 a=math.tau*j/80
 if math.sin(a)<0 and abs(math.cos(a)*R)<.7:continue
 for z in [.42,.91,1.4,1.89]:
  for sign in [-1,1]:rod('Interior lattice', (3.22*math.cos(a-.04),3.22*math.sin(a-.04),z-sign*.24),(3.22*math.cos(a+.04),3.22*math.sin(a+.04),z+sign*.24),.014,wood)
for x in [-1.12,1.12]:
 cube('Painted crown support',(x,.38,1.83),(.12,.14,3.58),red)
 cube('Support capital',(x,.38,3.41),(.43,.19,.11),wood)
 for z in [.5,2.4,3.25]:cube('Support carved collar',(x,.38,z),(.16,.18,.065),gold)
for x in [-2.9,2.9]:
 for y in [-2.8,2.8]:
  lathe('Stone post footing',[(.28,-.03),(.23,.45),(.15,.5)],stone,8,(x,y,0));rod('Exterior ceremonial post',(x,y,.4),(x,y,3.35),.065,wood);ball('Post finial',(x,y,3.43),(.09,.09,.17),wood)
current=group('02_Interior_Furnishings')
# Rectangular woven rugs and stitched borders.
for x,y,sx,sy in [(0,.35,2.5,3.8),(-1.9,.4,1.05,2.6),(1.9,.4,1.05,2.6)]:
 cube('Woven floor carpet',(x,y,.058),(sx,sy,.022),leather,.02)
 for inset in [.06,.12]:
  for xx in [-1,1]:cube('Rug border',(x+xx*(sx/2-inset),y,.074),(.018,sy-.1,.003),ivory,.001)
  for yy in [-1,1]:cube('Rug border',(x,y+yy*(sy/2-inset),.074),(sx-.1,.018,.003),red,.001)
# Low beds to each side with mattresses, bolsters and irregular fur blanket.
for side in [-1,1]:
 x=side*2.43
 cube('Carved wooden bed frame',(x,.4,.37),(.95,2.1,.20),wood,.06)
 cube('Wool mattress',(x,.4,.52),(.87,1.98,.14),cloth if side<0 else blue,.08)
 for y in [-.63,1.43]:cube('Bed end board',(x,y,.60),(1.01,.09,.50),wood,.09)
 for xx in [-.36,.36]:
  for y in [-.4,1.15]:cube('Bed leg',(x+xx,y,.17),(.10,.1,.29),wood)
 b=ball('Linen bolster',(x,1.04,.68),(.35,.18,.15),ivory)
 for j in range(9):
  y=-.4+j*.14;ball('Fur blanket fold',(x+.06*math.sin(j),y,.625),(.42,.13,.045),fur)
 for y in [-.4,.1,.6,1.1]:
  o=torus('Bed carved medallion',(x-side*.49,y,.4),.06,.009,gold);o.rotation_euler.y=math.pi/2
# Back altar with vessels, offerings, prayer flags.
cube('Altar chest',(0,2.48,.56),(1.4,.54,.93),wood,.04)
cube('Altar upper shelf',(0,2.47,1.08),(1.55,.62,.08),wood)
cube('Offering table',(0,1.92,.42),(1.7,.58,.09),wood)
for x in [-.70,.70]:cube('Offering table leg',(x,1.92,.23),(.1,.42,.40),wood)
for j,m in enumerate([blue,ivory,red,cloth,gold]):cube('Five-color altar cloth',(-.56+j*.28,1.61,.32),(.265,.014,.25),m,.002)
for j in range(7):
 x=-.63+j*.21;lathe('Offering bowl',[(.028,0),(.064,.055),(.068,.065)],gold,24,(x,1.92,.47))
for x in [-.5,.5]:
 lathe('Ceremonial vase',[(.08,0),(.11,.12),(.06,.23),(.035,.27),(.055,.3)],blue,32,(x,2.43,1.13))
 for dx in [-.03,.03]:rod('Vase incense',(x+dx,2.43,1.42),(x+dx*.4,2.43,1.66),.003,wood)
cyl('Altar mirror foot',(0,2.44,1.16),.18,.07,gold)
o=cyl('Altar polished mirror',(0,2.46,1.42),.22,.025,gold);o.rotation_euler.x=math.pi/2
# Wall textiles carry original geometric face motifs, inspired by references.
for x,y,w,h,m in [(0,3.08,1.2,1.32,ivory),(-2.28,2.05,1.02,1.28,red),(2.28,2.05,1.02,1.28,blue)]:
 cube('Spirit wall hanging',(x,y,1.98),(w,.035,h),m,.015)
 for xx in [-1,1]:cube('Hanging border',(x+xx*(w/2-.06),y-.025,1.98),(.045,.01,h-.06),leather,.002)
 for zz in [-1,1]:cube('Hanging border',(x,y-.025,1.98+zz*(h/2-.05)),(w-.06,.01,.045),leather,.002)
 ball('Woven spirit face',(x,y-.028,2.02),(.28,.012,.37),leather)
 for xx in [-.11,.11]:
  path('Spirit embroidered eye',[(x+xx-.065,y-.045,2.13),(x+xx,y-.045,2.17),(x+xx+.065,y-.045,2.13)],.016,ivory)
 path('Spirit embroidered nose',[(x,y-.046,2.13),(x-.02,y-.046,1.98),(x+.05,y-.046,1.96)],.015,ivory)
 path('Spirit embroidered mouth',[(x-.1,y-.046,1.89),(x,y-.046,1.87),(x+.1,y-.046,1.89)],.014,ivory)
 for j in range(16):rod('Textile fringe',(x-w/2+j*w/15,y,1.98-h/2),(x-w/2+j*w/15,y,1.90-h/2),.005,leather)
for x in [-1.1,1.1,1.65]:
 o=cyl('Hanging frame drum',(x,2.78,1.87),.24,.055,wood);o.rotation_euler.x=math.pi/2
 o=cyl('Hanging hide drum skin',(x,2.741,1.87),.222,.008,tan);o.rotation_euler.x=math.pi/2
# Iron fire basket kept to the side of the entrance, leaving the cards unobstructed.
for z in [.18,.33,.48]:torus('Hearth iron hoop',(-1.7,-1.50,z),.25,.022,black)
for j in range(8):
 a=j*math.tau/8;rod('Hearth upright',(-1.7+.25*math.cos(a),-1.5+.25*math.sin(a),.09),(-1.7+.25*math.cos(a),-1.5+.25*math.sin(a),.65),.02,black)
current=group('03_Shaman_Central_Figure')
# Standing, front-facing ceremonial figure at the horizontal center of the ger.
# Torso, skirt, boots, hands and masked head are genuine three-dimensional meshes.
lathe('Shaman layered robe',[(.31,.40),(.35,.59),(.30,.95),(.24,1.20),(.31,1.52),(.23,1.64),(.12,1.68)],leather,64,fold=.018)
for x in [-.16,.16]:
 ball('Shaman boot',(x,-.06,.18),(.12,.21,.13),leather);lathe('Boot shaft',[(.09,.2),(.10,.47),(.08,.57)],leather,32,(x,0,0))
for side in [-1,1]:
 rod('Shaman upper sleeve',(side*.27,0,1.50),(side*.42,-.02,1.18),.125,leather)
 rod('Shaman forearm sleeve',(side*.42,-.02,1.18),(side*.44,-.11,.99),.095,leather)
 ball('Shaman hand',(side*.44,-.12,.94),(.065,.048,.105),skin)
 for j in range(4):rod('Hand finger',(side*.44+(j-1.5)*.019,-.14,.93),(side*.44+(j-1.5)*.019,-.15,.85+abs(j-1.5)*.01),.009,skin)
 ball('Shoulder fur mantle',(side*.26,.005,1.51),(.18,.20,.115),fur)
# Mask entirely obscures the face as in the reference.
ball('Shaman head',(0,0,1.78),(.14,.125,.20),leather)
ball('Carved ritual mask',(0,-.105,1.80),(.139,.055,.16),wood)
for x in [-.056,.056]:
 ball('Mask eye silver rim',(x,-.159,1.84),(.038,.016,.026),gold)
 ball('Mask eye hollow',(x,-.173,1.84),(.023,.006,.013),black)
rod('Mask nose',(0,-.169,1.86),(0,-.19,1.76),.016,wood)
for j in range(9):ball('Mask silver teeth',((j-4)*.023,-.155,1.705),(.008,.012,.012),ivory)
# Hanging veil strands, leather ribbons and bead necklaces.
for j in range(23):
 x=(j-11)*.0105;path('Mask hanging fringe',[(x,-.15,1.71),(x+.006,-.155,1.57),(x+.009*math.sin(j),-.14,1.40+random.random()*.08)],.0038,feather)
for k in range(3):
 pts=[]
 for j in range(30):
  t=math.pi*j/29;x=.19*math.cos(t);z=1.54-(.12+k*.05)*math.sin(t);pts.append((x,-.24,z))
  if j%2==0:ball('Bone necklace bead',(x,-.24,z),(.012,.009,.015),ivory)
 path('Necklace cord',pts,.005,wood)
for side in [-1,1]:
 for j in range(20):
  x=side*(.20+.20*j/19);z=1.53-.28*j/19
  path('Sleeve and coat tassel',[(x,-.12,z),(x+side*.025,-.14,z-.25),(x+side*.016,-.12,z-.40-random.random()*.18)],.006,leather if j%3 else feather)
 for j in range(8):
  z=1.43-j*.115;ball('Front fur pelt tuft',(side*.23,-.20,z),(.055,.048,.105),fur)
for j in range(54):
 a=j*math.tau/54;rod('Robe hem fringe',(.32*math.cos(a),.32*math.sin(a),.47),(.34*math.cos(a),.34*math.sin(a),.31+random.random()*.07),.004,leather)
# Curved horns and an array of shaped feathers with central quills.
for side in [-1,1]:
 pts=[(side*.105,0,1.93),(side*.18,0,2.04),(side*.22,.015,2.16),(side*.20,.025,2.25)]
 for j in range(3):
  a,b=Vector(pts[j]),Vector(pts[j+1]);bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=.045*(1-j/3),radius2=.045*(1-(j+1)/3),depth=(b-a).length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();finish(o,'Headdress curved horn',leather)
def plume(a,b,w):
 a,b=Vector(a),Vector(b);axis=b-a;side=Vector((axis.z,0,-axis.x)).normalized();vs=[]
 for j in range(13):
  t=j/12;c=a+axis*t;ww=w*math.sin(math.pi*t)**.65*(1+.12*math.sin(j*4))
  vs.extend([tuple(c-side*ww),tuple(c+Vector((0,-.022*math.sin(math.pi*t),0))),tuple(c+side*ww)])
 fs=[]
 for j in range(12):
  for k in range(2):q=j*3+k;fs.append((q,q+1,q+4,q+3))
 surface('Headdress raven feather',vs,fs,feather);rod('Feather quill',a,b,.0035,ivory)
for j in range(13):
 a=(j-6)*.18;plume((.09*math.sin(a),.045,1.91),(.52*math.sin(a),.08,1.94+.47*math.cos(a)),.048)
for side in [-1,1]:
 for j in range(5):plume((side*.12,.08,1.81-j*.055),(side*(.29+j*.02),.10,1.60-j*.09),.047)
for j in range(11):ball('Headdress forehead silver ornament',((j-5)*.024,-.115,1.94+ .015*math.cos(j)),(.009,.012,.012),gold)
# Hand-held hide drum faces the visitor and has rim lacing and symbolic strokes.
drumcenter=(.52,-.28,1.18)
o=cyl('Shaman drum wood frame',drumcenter,.295,.085,wood,64);o.rotation_euler.x=math.pi/2
o=cyl('Shaman drum hide',(.52,-.329,1.18),.276,.012,tan,64);o.rotation_euler.x=math.pi/2
for j in range(24):
 a=j*math.tau/24;rod('Drum rim lacing',(.52+.285*math.cos(a),-.34,1.18+.285*math.sin(a)),(.52+.285*math.cos(a+.08),-.25,1.18+.285*math.sin(a+.08)),.004,ivory)
for j in range(5):
 a=j*math.tau/5;x=.52+.16*math.sin(a);z=1.18+.16*math.cos(a)
 path('Drum painted branching symbol',[(x-.025,-.338,z-.03),(x,-.338,z+.035),(x+.028,-.338,z-.015)],.005,red)
ball('Drum sun motif',(.52,-.34,1.18),(.035,.003,.035),gold)
shamanroot=bpy.data.objects.new('Shaman_ROOT',None);current.objects.link(shamanroot)
for o in list(current.objects):
 if o!=shamanroot:o.parent=shamanroot
current=group('04_Seven_Selectable_Cards')
# Low table in front of the shaman; seven separate card pivots.
cube('Low divination table',(0,-1.04,.48),(1.75,.68,.075),wood)
cube('Divination table textile',(0,-1.04,.524),(1.80,.71,.013),cloth,.012)
for x in [-.72,.72]:
 for y in [-1.28,-.80]:cube('Low table leg',(x,y,.25),(.075,.075,.45),wood)
for i in range(7):
 root=bpy.data.objects.new('TarotCard_%02d'%i,None);current.objects.link(root);root.location=((i-3)*.235,-1.07,.547)
 before=set(current.objects)
 cube('Card %02d parchment'%i,(0,0,0),(.205,.335,.008),paper,.007)
 cube('Card %02d back'%i,(0,0,.005),(.193,.323,.002),dark,.006)
 for x,y,w,h in [(0,-.143,.164,.004),(0,.143,.164,.004),(-.08,0,.004,.286),(.08,0,.004,.286)]:cube('Card gold border',(x,y,.007),(w,h,.001),gold,.001)
 torus('Card back celestial ring',(0,0,.008),.047,.0028,gold)
 for j in range(8):
  a=j*math.tau/8;ball('Card star',(.065*math.cos(a),.105*math.sin(a),.008),(.0025,.0025,.001),gold)
 cube('Card front placeholder',(0,0,-.005),(.19,.32,.002),ivory,.004)
 ball('Card front sun',(0,.03,-.007),(.039,.039,.002),gold)
 for o in set(current.objects)-before:o.parent=root
current=group('05_Cameras_and_Lighting')
world=bpy.data.worlds.new('Twilight');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.39,.5,1);world.node_tree.nodes['Background'].inputs[1].default_value=.35
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
def area(n,loc,target,color,power,size):
 d=bpy.data.lights.new(n,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(n,d);current.objects.link(o);o.location=loc;aim(o,target)
area('Warm interior fill',(-1,-1,2.9),(0,.3,1),(1,.70,.42),170,2.4)
area('Crown skylight',(0,0,3.8),(0,0,.5),(.67,.78,1),180,1.0)
area('Entrance soft light',(0,-2.8,2.0),(0,0,1.1),(1,.84,.66),120,2)
area('Exterior daylight',(-4,-6,8),(0,0,1),(1,.84,.64),1800,7)
area('Exterior rim',(3,3,6),(0,0,2),(.65,.76,1),1000,5)
def camera(n,loc,target,lens):
 bpy.ops.object.camera_add(location=loc);o=bpy.context.object;o.name=n;aim(o,target);o.data.lens=lens
 for c in list(o.users_collection):c.objects.unlink(o)
 current.objects.link(o);return o
inside=camera('Camera_Interior',(0,-3.02,1.9),(0,.65,1.35),23)
outside=camera('Camera_Exterior',(7,-10,6.6),(0,0,1.65),45)
portrait=camera('Camera_Shaman',(.75,-2.25,1.9),(0,0,1.4),40)
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=32;sc.cycles.use_denoising=True;sc.render.resolution_x=1500;sc.render.resolution_y=1150;sc.render.resolution_percentage=100;sc.camera=inside
for o in bpy.data.objects:
 if o.name.startswith(('Spirit wall hanging','Hanging border','Woven spirit face','Spirit embroidered','Textile fringe')):
  # Mesh/cylinder objects store local centers, whereas curves store world coordinates.
  if o.type=='CURVE':
   pts=[p for s in o.data.splines for p in s.points]
   x=sum(p.co.x for p in pts)/len(pts)
  else:x=o.location.x
  if abs(x)>1:
   o.location.x+=-.12 if x>0 else .12;o.location.y-=.35;o.location.z-=.17
  else:o.location.y-=.22
 if o.name.startswith('Painted crown support'):o.scale.z*=.96;o.location.z-=.072
 if o.name.startswith('Support capital'):o.location.z-=.09
# Keep the feathers and facial veil close to the dark reference palette.
for name,col in [('Raven feathers',(.006,.005,.004)),('Shaman weathered leather',(.055,.028,.013))]:
 m=bpy.data.materials[name];m.diffuse_color=(*col,1);m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*col,1)
bpy.data.objects['Camera_Exterior'].data.lens=39
sc=bpy.context.scene;sc.view_settings.exposure=-.45;sc.camera=bpy.data.objects['Camera_Interior']
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'ger_shaman.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'ger_shaman.glb'),export_format='GLB',export_apply=True)
for cam,name in [(inside,'interior'),(outside,'exterior'),(portrait,'shaman_detail')]:
 sc.camera=cam;sc.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True)
print('DELIVERY_COMPLETE')




