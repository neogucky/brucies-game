"""Measure six connected cutouts per original atlas; output only frame metadata."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'prototypes/sword-study'
studies = []
extents = [0, 0, 0]
for name in ['simple', 'grounded', 'realistic']:
    im = Image.open(ROOT / 'assets' / (name + '.png')).convert('RGBA')
    width, height = im.size
    pixels = im.load()
    seen = bytearray(width * height)
    components = []
    for y in range(height):
        for x in range(width):
            if seen[y*width+x] or pixels[x, y][3] < 100:
                continue
            seen[y*width+x] = 1
            queue = [(x, y)]
            for xx, yy in queue:
                for nx, ny in [(xx-1, yy), (xx+1, yy), (xx, yy-1), (xx, yy+1)]:
                    if 0 <= nx < width and 0 <= ny < height and not seen[ny*width+nx] and pixels[nx, ny][3] >= 100:
                        seen[ny*width+nx] = 1
                        queue.append((nx, ny))
            if len(queue) > 5000:
                components.append(queue)
    if len(components) != 6:
        raise ValueError(f'{name}: expected six poses, got {len(components)}')
    components.sort(key=lambda q: (int((min(p[1] for p in q)+max(p[1] for p in q))/2 >= height/2), min(p[0] for p in q)))
    frames = []
    for queue in components:
        x = max(0, min(p[0] for p in queue)-2)
        y = max(0, min(p[1] for p in queue)-2)
        right = min(width, max(p[0] for p in queue)+3)
        bottom = min(height, max(p[1] for p in queue)+3)
        brown = []
        for xx, yy in queue:
            r, g, b, _ = pixels[xx, yy]
            if yy > y+(bottom-y)*.65 and 1.15 < r/max(1,g) < 2.5 and g > b*1.25 and 30 < g < 160:
                brown.append((xx, yy))
        floor = max(p[1] for p in brown)
        soles = [p for p in brown if p[1] >= floor-14]
        root = [(min(p[0] for p in soles)+max(p[0] for p in soles))/2, floor+3]
        # Per-row mask spans keep a neighbouring cape out of a wide sword's
        # bounding rectangle. Expand two pixels to preserve the original AA.
        rows = {}
        for xx, yy in queue:
            for dy in range(-2, 3):
                row = rows.setdefault(yy+dy, [])
                row.append((xx-2, xx+3))
        runs = []
        for yy, spans in sorted(rows.items()):
            if yy < y or yy >= bottom:
                continue
            spans.sort(); a, b = spans[0]
            for c, d in spans[1:]:
                if c <= b:
                    b = max(b, d)
                else:
                    runs.append([yy-y, max(x,a)-x, min(right,b)-max(x,a)])
                    a, b = c, d
            runs.append([yy-y, max(x,a)-x, min(right,b)-max(x,a)])
        frames.append({'rect': [x,y,right-x,bottom-y], 'root': root, 'runs': runs})
        extents[0] = max(extents[0], root[0]-x)
        extents[1] = max(extents[1], right-root[0])
        extents[2] = max(extents[2], root[1]-y)
    studies.append({'id': name, 'source': 'assets/'+name+'.png', 'frames': frames})

pixel_scale = min(.57, 192/extents[0], 212/extents[1], 312/extents[2])
(ROOT / 'frames.json').write_text(json.dumps({'pixelScale': pixel_scale, 'studies': studies}, separators=(',',':'))+'\n')
print('Measured', len(studies)*6, 'original poses; shared scale', round(pixel_scale,3))
