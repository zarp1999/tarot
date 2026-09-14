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
# Timber floor and circular shell. Entrance is behind the camera.
for i in range(29):
 x=(i-14)*.23; length=2*math.sqrt(max(.01,3.4**2-x*x));cube('Floor plank %02d'%i,(x,0,-.045),(.222,length,.09),wood,.008)
for i in range(56):
 a=2*math.pi*i/56
 if math.sin(a)<-.88:continue
 o=cube('Felt wall panel %02d'%i,(3.3*math.cos(a),3.3*math.sin(a),1.45),(.39,.065,2.9),felt,.008);o.rotation_euler.z=a+math.pi/2
 for sign in [-1,1]:
  for z in [.35,.95,1.55,2.15]:
   a1=a-.055; a2=a+.055
   rod('Ger diamond lattice',(3.25*math.cos(a1),3.25*math.sin(a1),z-sign*.29),(3.25*math.cos(a2),3.25*math.sin(a2),z+sign*.29),.018,wood)
 rod('Roof radial beam',(3.3*math.cos(a),3.3*math.sin(a),2.9),(.67*math.cos(a),.67*math.sin(a),3.85),.038,wood)
for z in [.16,2.75,2.9]:torus('Circular wall binding',(0,0,z),3.27,.035,gold if z==2.75 else wood)
torus('Crown skylight timber',(0,0,3.85),.67,.075,wood)
# Decorative textile hangings at back.
for x in [-2.15,0,2.15]:
 cube('Burgundy wall tapestry',(x,2.48,1.64),(.66,.035,2.18),cloth)
 for dx in [-.29,.29]:cube('Tapestry gold trim',(x+dx,2.451,1.64),(.022,.009,2.14),gold,.002)
 for z in [.85,1.25,1.65,2.05,2.45]:
  o=cube('Tapestry diamond motif',(x,2.449,z),(.14,.012,.14),gold,.005);o.rotation_euler.y=math.pi/4
# Round table and sculpted draped tablecloth.
cyl('Round walnut tabletop',(0,0,1.02),1.24,.105,wood,96)
for x in [-.73,.73]:
 for y in [-.60,.60]:
  rod('Turned table leg',(x,y,.08),(x*.92,y*.92,.99),.075,wood)
  ball('Table leg brass collar',(x,y,.23),(.085,.085,.07),gold)
verts=[];faces=[];N=128
rings=[(0,1.078),(.55,1.079),(1.15,1.077),(1.245,1.04),(1.28,.9),(1.30,.64),(1.34,.37)]
for k,(r,z) in enumerate(rings):
 for j in range(N):
  a=j*2*math.pi/N; f=max(0,k-2)/4;rr=r+f*(.042*math.sin(a*18)+.021*math.sin(a*29));zz=z+f*.055*math.cos(a*18)
  verts.append((rr*math.cos(a),rr*math.sin(a),zz))
for k in range(len(rings)-1):
 for j in range(N): a=k*N+j;b=k*N+(j+1)%N;faces.append((a,b,b+N,a+N))
mesh=bpy.data.meshes.new('Draped fabric mesh');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Tablecloth | sculpted hanging folds',mesh);bpy.context.collection.objects.link(o);finish(o,o.name,cloth)
for p in mesh.polygons:p.use_smooth=True
sol=o.modifiers.new('Fabric thickness','SOLIDIFY');sol.thickness=.004
for r in [1.10,1.13]:torus('Embroidered circular trim',(0,0,1.084),r,.006,gold)
for j in range(48):
 a=j*math.tau/48;o=cube('Cloth embroidered lozenge',(.99*math.cos(a),.99*math.sin(a),1.085),(.028,.028,.002),gold,.002);o.rotation_euler.z=a+math.pi/4
# High-backed chair behind table, visible at right.
cx,cy=1.55,1.13
cube('Chair upholstered seat',(cx,cy,.57),(.64,.62,.15),cloth,.07)
for dx in [-.27,.27]:
 for dy in [-.25,.25]:rod('Chair carved leg',(cx+dx,cy+dy,.04),(cx+dx,cy+dy,.57),.035,wood)
 rod('Chair back upright',(cx+dx,cy+.26,.5),(cx+dx,cy+.26,1.67),.042,wood)
cube('Chair back crest',(cx,cy+.26,1.67),(.65,.085,.14),wood,.06)
for dx in [-.16,0,.16]:
 rod('Chair back spindle',(cx+dx,cy+.26,.72),(cx+dx,cy+.26,1.6),.02,gold)
# Rear cabinet, books and bottles.
cube('Cabinet body',(-1.5,2.05,.75),(1.0,.46,1.5),wood)
for z in [.3,.72,1.14]:
 cube('Cabinet drawer',(-1.5,1.805,z),(.92,.035,.34),cloth)
 ball('Drawer brass knob',(-1.5,1.77,z),(.04,.025,.025),gold)
for i in range(7):
 o=cube('Old bound volume',(-1.89+i*.12,2.05,1.72),(.095,.29,.35+random.random()*.14),[cloth,dark,wood][i%3]);o.rotation_euler.y=random.uniform(-.09,.09)
# Crystal and candles remain clear of the selectable cards.
cyl('Crystal pedestal',(.48,.57,1.13),.19,.09,gold)
torus('Crystal setting',(.48,.57,1.2),.17,.018,gold)
ball('Amethyst scrying sphere',(.48,.57,1.39),(.205,.205,.205),purple)
flame=mat('Flame amber',(1,.29,.025));p=flame.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(1,.16,.008,1);p.inputs['Emission Strength'].default_value=5
def light(n,loc,color,power,size):
 d=bpy.data.lights.new(n,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(n,d);bpy.context.collection.objects.link(o);o.location=loc;return o
for x,y,h in [(-.73,.48,.47),(-.43,.72,.64)]:
 cyl('Candlestick foot',(x,y,1.11),.09,.04,gold);rod('Candlestick stem',(x,y,1.13),(x,y,1.3),.026,gold);cyl('Candle',(x,y,1.3+h/2),.039,h,wax)
 ball('Candle flame',(x,y,1.3+h+.04),(.018,.018,.045),flame)
 d=bpy.data.lights.new('Warm candle glow','POINT');d.energy=16;d.color=(1,.38,.10);d.shadow_soft_size=.12;o=bpy.data.objects.new(d.name,d);bpy.context.collection.objects.link(o);o.location=(x,y,1.3+h+.07)
# Each card has its own parent centered on the card for runtime flipping.
for i in range(7):
 root=bpy.data.objects.new('TarotCard_%02d'%i,None);bpy.context.collection.objects.link(root);root.location=((i-3)*.25,-.36,1.10)
 parts=[];parts.append(cube('Card_%02d_body'%i,(0,0,0),(.215,.365,.008),paper,.009))
 parts.append(cube('Card_%02d_back'%i,(0,0,.005),(.202,.352,.002),dark,.007))
 for x,y,w,h in [(0,-.158,.175,.005),(0,.158,.175,.005),(-.086,0,.005,.316),(.086,0,.005,.316)]:parts.append(cube('Card back gold border',(x,y,.007),(w,h,.0015),gold,.001))
 ring=torus('Card celestial seal',(0,0,.008),.046,.003,gold);parts.append(ring)
 for a in range(8):
  t=a*math.tau/8;parts.append(ball('Card star',(.063*math.cos(t),.097*math.sin(t),.008),(.003,.004,.0015),gold))
 # Front face geometry is on the underside while face down.
 parts.append(cube('Card_%02d_front'%i,(0,0,-.005),(.195,.342,.002),paper,.004))
 parts.append(ball('Tarot front sun',(0,.04,-.008),(.045,.045,.002),gold))
 for j in range(3):parts.append(cube('Tarot front illustration',(0,-.035-j*.025,-.008),(.11-j*.02,.006,.002),dark,.001))
 for p in parts:p.parent=root
# Deck stacked at side.
for i in range(12):cube('Stacked tarot deck',(.76,.10,1.096+i*.009),(.22,.36,.008),dark if i==11 else paper,.008)
# Render setup.
world=bpy.data.worlds.new('Evening ambient');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.10,.13,.20,1);world.node_tree.nodes['Background'].inputs[1].default_value=.28
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
o=light('Warm softbox',(-2,-1,3.0),(1,.65,.35),150,3);aim(o,(0,0,1))
o=light('Cool skylight',(1,1,3.7),(.39,.58,1),180,2);aim(o,(0,0,.5))
o=light('Front fill',(0,-3,2.8),(1,.82,.65),65,3);aim(o,(0,0,1))
bpy.ops.object.camera_add(location=(1.35,-2.7,2.45));cam=bpy.context.object;cam.name='Camera | tarot experience';aim(cam,(0,.45,1.25));cam.data.lens=26;bpy.context.scene.camera=cam
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=32;sc.cycles.use_denoising=True;sc.render.resolution_x=1400;sc.render.resolution_y=1100;sc.render.resolution_percentage=100
sc.world.color=(.1,.1,.1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'ger_tarot_room.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'ger_tarot_room.glb'),export_format='GLB',export_apply=True)
sc.render.filepath=os.path.join(OUT,'ger_tarot_preview.png');bpy.ops.render.render(write_still=True)

