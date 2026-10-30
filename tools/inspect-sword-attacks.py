"""Measure original sword PNGs. Output metadata only; do not alter artwork."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'assets/common/characters/sword-b'
SCALES = {'male-stand': .4, 'female-stand': .4,
          'male-crouch': .395, 'female-crouch': .33,
          'male-jump': .33, 'female-jump': .33}
result = {}
# The buckle is partly covered by the sword glove in these follow-throughs.
# Register the pelvis itself, rather than accidentally anchoring to the guard.
PELVISES = {'male-jump': {4: 200, 5: 585}, 'female-jump': {4: 211, 5: 595},
            'male-stand': {5: 1040}, 'female-stand': {5: 1040}}
for name, scale in SCALES.items():
    standing = name.endswith('stand')
    filename = name + ('-v3.png' if standing else '-v2.png' if name == 'male-crouch' else '-v1.png')
    im = Image.open(ROOT / filename).convert('RGBA')
    width, height = im.size
    pixels = im.load()
    seen = bytearray(width * height)
    components = []
    for y in range(height):
        for x in range(width):
            if seen[y*width+x] or pixels[x,y][3] < 100:
                continue
            seen[y*width+x] = 1
            queue = [(x,y)]
            for xx,yy in queue:
                for nx,ny in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)]:
                    if 0 <= nx < width and 0 <= ny < height and not seen[ny*width+nx] and pixels[nx,ny][3] >= 100:
                        seen[ny*width+nx] = 1
                        queue.append((nx,ny))
            if len(queue) > 4500:
                components.append(queue)
    count, rows = (9,3) if standing else (8,2)
    if len(components) != count:
        raise ValueError(f'{name}: expected {count} separate silhouettes, got {len(components)}')
    components.sort(key=lambda q: (int((min(p[1] for p in q)+max(p[1] for p in q))/2 / (height/rows)), min(p[0] for p in q)))
    frames = []
    for index, queue in enumerate(components):
        # One crouched extension touches the source's right canvas edge. Its
        # complete neighbouring key poses cover the same low cut; omit it.
        if name.endswith('crouch') and index == 3:
            continue
        left = max(0,min(p[0] for p in queue)-2)
        top = max(0,min(p[1] for p in queue)-2)
        right = min(width,max(p[0] for p in queue)+3)
        bottom = min(height,max(p[1] for p in queue)+3)
        brown = []
        for xx,yy in queue:
            r,g,b,_ = pixels[xx,yy]
            if yy > top+(bottom-top)*.7 and 1.15 < r/max(1,g) < 2.5 and g > b*1.25 and 30 < g < 160:
                brown.append((xx,yy))
        floor = max(p[1] for p in brown)
        soles = [p for p in brown if p[1] >= floor-12]
        root = [(min(p[0] for p in soles)+max(p[0] for p in soles))/2,floor+2]
        # The physics actor belongs under the pelvis. A boot midpoint moves far
        # behind it during weight transfer, making a planted cut look like a
        # backwards slide. The small golden belt buckle is a stable art anchor.
        gold = {(xx,yy) for xx,yy in queue if top+(bottom-top)*.58 < yy < top+(bottom-top)*.88
                and pixels[xx,yy][0] > 200 and pixels[xx,yy][1] > 145 and pixels[xx,yy][2] < 95}
        buckles = []
        while gold:
            first = gold.pop(); cluster = [first]
            for xx,yy in cluster:
                for p in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)]:
                    if p in gold:
                        gold.remove(p); cluster.append(p)
            if len(cluster) >= 8:
                cx = sum(p[0] for p in cluster)/len(cluster)
                cy = sum(p[1] for p in cluster)/len(cluster)
                score = abs(cy-(floor-(bottom-top)*.31)) + abs(cx-(root[0]+(bottom-top)*.1))*.35
                buckles.append((score,cx,cy))
        if not buckles:
            raise ValueError(f'{name} {index}: missing belt anchor')
        buckle = min(buckles)
        root[0] = buckle[1]
        root[0] = PELVISES.get(name, {}).get(index, root[0])
        # Per-row mask avoids neighbouring capes in the wide sword bounds.
        rows = {}
        for xx,yy in queue:
            for dy in range(-2,3):
                spans = rows.setdefault(yy+dy,[])
                spans.append((xx-2,xx+3))
        runs = []
        for yy, spans in sorted(rows.items()):
            if yy < top or yy >= bottom:
                continue
            spans.sort(); a,b = spans[0]
            for c,d in spans[1:]:
                if c <= b:
                    b = max(b,d)
                else:
                    runs.append([yy-top,max(left,a)-left,min(right,b)-max(left,a)])
                    a,b = c,d
            runs.append([yy-top,max(left,a)-left,min(right,b)-max(left,a)])
        frames.append({'sourceIndex':index,'rect':[left,top,right-left,bottom-top], 'root':root,'runs':runs})
    reach = lambda f: (f['rect'][0]+f['rect'][2]-f['root'][0])*scale
    result[name] = {'source':filename,'pixelScale':scale,'frames':frames,'maxReach':max(map(reach,frames))}
    print(name, len(frames), 'poses; reach',round(result[name]['maxReach'],1),
          'heights', [round((f['root'][1]-f['rect'][1])*scale) for f in frames])
(ROOT / 'frames.json').write_text(json.dumps(result,separators=(',',':'))+'\n')

# Isometric sword swings need a right-facing torso with the anatomical right
# shoulder socket on image-left as well. It is independent of the hammer rig.
im=Image.open(ROOT/'right-bodies-v1.png').convert('RGBA');width,height=im.size;pixels=im.load()
seen=bytearray(width*height);bodies=[]
for y in range(height):
    for x in range(width):
        if seen[y*width+x] or pixels[x,y][3]<100:continue
        seen[y*width+x]=1;q=[(x,y)]
        for xx,yy in q:
            for nx,ny in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)]:
                if 0<=nx<width and 0<=ny<height and not seen[ny*width+nx] and pixels[nx,ny][3]>=100:
                    seen[ny*width+nx]=1;q.append((nx,ny))
        if len(q)>5000:bodies.append(q)
assert len(bodies)==12,f'right bodies: {len(bodies)}'
bodies.sort(key=lambda q:(int((min(p[1] for p in q)+max(p[1] for p in q))/2/(height/4)),min(p[0] for p in q)))
rows=[]
for i,q in enumerate(bodies):
    x=min(p[0] for p in q);y=min(p[1] for p in q);right=max(p[0] for p in q)+1;bottom=max(p[1] for p in q)+1
    boots=[(xx,yy) for xx,yy in q if yy>y+(bottom-y)*.83 and pixels[xx,yy][0]>pixels[xx,yy][1]*1.15 and pixels[xx,yy][1]>pixels[xx,yy][2]*1.25 and 30<pixels[xx,yy][1]<160]
    floor=max(p[1] for p in boots);soles=[p for p in boots if p[1]>=floor-12]
    footX=(min(p[0] for p in soles)+max(p[0] for p in soles))/2;footY=floor+1
    blue=[(xx,yy) for xx,yy in q if footX-100<xx<footX and y+(bottom-y)*.4<yy<y+(bottom-y)*.66
          and pixels[xx,yy][0]<75 and pixels[xx,yy][1]<150 and pixels[xx,yy][2]>max(85,pixels[xx,yy][1]*1.2,pixels[xx,yy][0]*1.5)]
    target=(footX-45,y+(bottom-y)*.53)
    near=sorted(blue,key=lambda p:(p[0]-target[0])**2+(p[1]-target[1])**2)[:150]
    sx=sum(p[0] for p in near)/len(near);sy=sum(p[1] for p in near)/len(near)
    if i%3==0:rows.append([])
    rows[-1].append([x,y,right-x,bottom-y,footX,footY,sx,sy])
(ROOT/'right-bodies.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
print('Measured 12 right-handed isometric body poses')

im=Image.open(ROOT/'left-far-bodies-v1.png').convert('RGBA');width,height=im.size;pixels=im.load()
seen=bytearray(width*height);bodies=[]
for y in range(height):
    for x in range(width):
        if seen[y*width+x] or pixels[x,y][3]<100:continue
        seen[y*width+x]=1;q=[(x,y)]
        for xx,yy in q:
            for nx,ny in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)]:
                if 0<=nx<width and 0<=ny<height and not seen[ny*width+nx] and pixels[nx,ny][3]>=100:
                    seen[ny*width+nx]=1;q.append((nx,ny))
        if len(q)>4000:bodies.append(q)
assert len(bodies)==18,f'far bodies: {len(bodies)}'
bodies.sort(key=lambda q:(int((min(p[1] for p in q)+max(p[1] for p in q))/2/(height/6)),min(p[0] for p in q)))
rows=[]
for i,q in enumerate(bodies):
    x=min(p[0] for p in q);y=min(p[1] for p in q);right=max(p[0] for p in q)+1;bottom=max(p[1] for p in q)+1
    boots=[(xx,yy) for xx,yy in q if yy>y+(bottom-y)*.84 and pixels[xx,yy][0]>pixels[xx,yy][1]*1.15 and pixels[xx,yy][1]>pixels[xx,yy][2]*1.25 and 30<pixels[xx,yy][1]<160]
    floor=max(p[1] for p in boots);soles=[p for p in boots if p[1]>=floor-10]
    footX=(min(p[0] for p in soles)+max(p[0] for p in soles))/2;footY=floor+1
    gold=[(xx,yy) for xx,yy in q if y+(bottom-y)*.6<yy<y+(bottom-y)*.84 and pixels[xx,yy][0]>210 and pixels[xx,yy][1]>145 and pixels[xx,yy][2]<95]
    if gold:
        near=sorted(gold,key=lambda p:(p[0]-footX)**2+(p[1]-(floor-(bottom-y)*.3))**2)[:40]
        footX=sum(p[0] for p in near)/len(near)
    # Infer the far shoulder inside the chest silhouette. Its cap and upper arm
    # are intentionally absent from the body artwork and occluded at runtime.
    sx=footX-(bottom-y)*.04;sy=y+(bottom-y)*.53
    if i%3==0:rows.append([])
    rows[-1].append([x,y,right-x,bottom-y,footX,footY,sx,sy])
(ROOT/'left-far-bodies.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
print('Measured 18 far-side body poses for stand, crouch and jump')
