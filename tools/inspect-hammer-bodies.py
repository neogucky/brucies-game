"""Measure original hammer body artwork; leave PNG pixels unchanged."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'assets/common/characters/hammer-motion'
im = Image.open(root / 'near-bodies-v1.png').convert('RGBA')
width, height = im.size
pixels = im.load()
seen = bytearray(width * height)
bodies = []
for y in range(height):
    for x in range(width):
        if seen[y*width+x] or pixels[x,y][3] < 100:
            continue
        seen[y*width+x] = 1
        q = [(x,y)]
        for xx,yy in q:
            for nx,ny in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)]:
                if 0 <= nx < width and 0 <= ny < height and not seen[ny*width+nx] and pixels[nx,ny][3] >= 100:
                    seen[ny*width+nx] = 1
                    q.append((nx,ny))
        if len(q) > 4000:
            bodies.append(q)
assert len(bodies) == 18, f'Expected 18 bodies, got {len(bodies)}'
bodies.sort(key=lambda q: (int((min(p[1] for p in q)+max(p[1] for p in q))/2/(height/6)), min(p[0] for p in q)))
rows = []
for i,q in enumerate(bodies):
    x,y = min(p[0] for p in q), min(p[1] for p in q)
    right,bottom = max(p[0] for p in q)+1, max(p[1] for p in q)+1
    boots = [(xx,yy) for xx,yy in q if yy > y+(bottom-y)*.83
             and pixels[xx,yy][0] > pixels[xx,yy][1]*1.15
             and pixels[xx,yy][1] > pixels[xx,yy][2]*1.25 and 30 < pixels[xx,yy][1] < 160]
    floor = max(p[1] for p in boots)
    soles = [p for p in boots if p[1] >= floor-10]
    footX,footY = (min(p[0] for p in soles)+max(p[0] for p in soles))/2, floor+1
    gold = [(xx,yy) for xx,yy in q if y+(bottom-y)*.6 < yy < y+(bottom-y)*.84
            and pixels[xx,yy][0] > 210 and pixels[xx,yy][1] > 145 and pixels[xx,yy][2] < 95]
    if gold:
        near = sorted(gold,key=lambda p: (p[0]-footX)**2+(p[1]-(floor-(bottom-y)*.3))**2)[:40]
        footX = sum(p[0] for p in near)/len(near)
    # The near right shoulder has a blue circular socket on image-left.
    blue = [(xx,yy) for xx,yy in q if footX-90 < xx < footX and y+(bottom-y)*.4 < yy < y+(bottom-y)*.7
            and pixels[xx,yy][0] < 75 and pixels[xx,yy][1] < 150
            and pixels[xx,yy][2] > max(85,pixels[xx,yy][1]*1.2,pixels[xx,yy][0]*1.5)]
    target = (footX-45, y+(bottom-y)*.57)
    near = sorted(blue,key=lambda p: (p[0]-target[0])**2+(p[1]-target[1])**2)[:120]
    assert near, f'Missing shoulder socket {i}'
    sx,sy = sum(p[0] for p in near)/len(near), sum(p[1] for p in near)/len(near)
    if i%3 == 0:
        rows.append([])
    rows[-1].append([x,y,right-x,bottom-y,footX,footY,sx,sy])
(root/'near-bodies.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
print('Measured 18 hammer bodies: male/female, standing/crouched/airborne.')
