"""Measure original PNG cutouts; never resample or edit the generated artwork."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'assets/common/characters/level-motion'


def measure(name, cols, rows, row_limits):
    im = Image.open(ROOT / (name + '.png')).convert('RGBA')
    w, h = im.size
    pixels = im.load()
    seen = bytearray(w * h)
    components = []
    for y in range(h):
        for x in range(w):
            if seen[y * w + x] or pixels[x, y][3] < 100:
                continue
            seen[y * w + x] = 1
            queue = [(x, y)]
            for xx, yy in queue:
                for nx, ny in [(xx-1, yy), (xx+1, yy), (xx, yy-1), (xx, yy+1)]:
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny*w+nx] and pixels[nx, ny][3] >= 100:
                        seen[ny*w+nx] = 1
                        queue.append((nx, ny))
            if len(queue) > 1500:
                components.append((min(p[0] for p in queue), min(p[1] for p in queue),
                                   max(p[0] for p in queue)+1, max(p[1] for p in queue)+1))
    if len(components) != cols * rows:
        raise ValueError(f'{name}: expected {cols * rows} separate silhouettes, found {len(components)}')
    result = []
    for row in range(rows):
        group = sorted((b for b in components if row*h/rows <= (b[1]+b[3])/2 < (row+1)*h/rows))
        if len(group) != cols:
            raise ValueError(f'{name} row {row}: {len(group)} silhouettes')
        for col, (x, y, right, bottom) in enumerate(group):
            root_x = col * w / cols + (85 if cols == 8 else 128) * w / (1448 if cols == 8 else 1536)
            # Front glove, above the boots. Restrict to the front of the body so
            # the red cape, hair and rear hand cannot become the weapon pivot.
            brown = []
            for yy in range(round(y + (bottom-y)*.43), round(y + (bottom-y)*.76)):
                for xx in range(x, min(right, round(root_x-8))):
                    r, g, b, a = pixels[xx, yy]
                    if a > 180 and 1.25 < r/max(1,g) < 2.6 and g > b*1.35 and 35 < g < 140:
                        brown.append((xx, yy))
            hand = [sum(p[0] for p in brown)/len(brown), sum(p[1] for p in brown)/len(brown)] if brown else [root_x-40, bottom-90]
            # The mirrored torso needs the OTHER painted glove to remain
            # anatomically right-handed. Ignore the blonde ponytail above it.
            rear = set()
            for yy in range(round(y+(bottom-y)*.43),round(y+(bottom-y)*.77)):
                for xx in range(max(x,round(root_x+8)),right):
                    r,g,b,a=pixels[xx,yy]
                    if a>180 and 1.6<r/max(1,g)<2.6 and g>b*1.35 and 35<g<140 and 90<r<230:
                        rear.add((xx,yy))
            clusters=[]
            while rear:
                q=[rear.pop()]
                for xx,yy in q:
                    for p in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)]:
                        if p in rear:rear.remove(p);q.append(p)
                if len(q)>20:
                    cx=sum(p[0] for p in q)/len(q);cy=sum(p[1] for p in q)/len(q)
                    clusters.append((abs(cy-(y+(bottom-y)*.74))+abs(cx-root_x-35)*.25-len(q)**.5*1.2,[cx,cy]))
            other = min(clusters)[1] if clusters else [root_x+35,hand[1]+5]
            result.append({'rect': [x, y, right-x, bottom-y], 'root': [root_x, bottom-2], 'hand': hand,'otherHand':other})
    return result


data = {
    'locomotion': measure('knight-locomotion', 8, 4, [0, 300, 580, 850, 1200]),
    'poses': measure('knight-poses', 8, 4, [0, 270, 540, 810, 1200]),
}
if (ROOT / 'helper-actions.png').exists():
    data['helper'] = measure('helper-actions', 6, 4, [0, 270, 530, 790, 1200])
data['rig'] = measure('knight-rig', 4, 3, [0, 490, 790, 1200])
(ROOT / 'frames.json').write_text(json.dumps(data, indent=2) + '\n')
