// Keep the original base frame, texture key, canvas dimensions and collider.
// Extra texture sources supply registered animation frames, including for Images.
export function labelEnemyPixels(pixels, width, height) {
  const labels = new Int32Array(width * height), queue = new Int32Array(width * height);
  let id = 0;
  for (let start = 0; start < labels.length; start++) {
    if (labels[start] || pixels[start * 4 + 3] < 80) continue;
    id++; let head = 0, tail = 1; queue[0] = start; labels[start] = id;
    while (head < tail) {
      const p = queue[head++], x = p % width;
      for (const next of [x ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width]) {
        if (next < 0 || next >= labels.length || labels[next] || pixels[next * 4 + 3] < 80) continue;
        labels[next] = id; queue[tail++] = next;
      }
    }
  }
  return labels;
}

export function isolateEnemyCell(pixels, labels, width, height, rect) {
  const [x, y, w, h] = rect, counts = new Map();
  for (let cy = y; cy < y + h; cy++) for (let cx = x; cx < x + w; cx++) {
    const id = labels[cy * width + cx]; if (id) counts.set(id, (counts.get(id) || 0) + 1);
  }
  const owner = [...counts].sort((a,b) => b[1] - a[1])[0]?.[0], out = new Uint8ClampedArray(w * h * 4);
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
    const p = (y + cy) * width + x + cx, alpha = pixels[p * 4 + 3];
    if (!alpha) continue;
    let ours = labels[p] === owner;
    // Recover the soft anti-aliased outline, but never another cell's limb.
    if (!ours && !labels[p]) outer: for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (x + cx + dx < 0 || x + cx + dx >= width || y + cy + dy < 0 || y + cy + dy >= height) continue;
      if (labels[p + dy * width + dx] === owner) { ours = true; break outer; }
    }
    if (ours) out.set(pixels.subarray(p * 4, p * 4 + 4), (cy * w + cx) * 4);
  }
  return out;
}

function readSheet(scene, key, frames) {
  const image = scene.textures.get(key).getSourceImage(), canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const labels = labelEnemyPixels(pixels, canvas.width, canvas.height);
  return frames.map(frame => {
    const [,,w,h] = frame.rect, cut = document.createElement('canvas'); cut.width = w; cut.height = h;
    cut.getContext('2d').putImageData(new ImageData(isolateEnemyCell(pixels, labels, canvas.width, canvas.height, frame.rect), w, h), 0, 0);
    return cut;
  });
}

function addMotionFrames(scene, key, sheet, spec, indices) {
  const texture = scene.textures.get(key), base = texture.get('__BASE'), w = base.realWidth, h = base.realHeight;
  // Render tails, raised tools and outstretched hands outside the logical body.
  // Trim metadata keeps display size, origin and physics exactly as before.
  const pad = 24, stride = w + pad * 2, height = h + pad * 2;
  const canvas = document.createElement('canvas'); canvas.width = stride * indices.length; canvas.height = height;
  const ctx = canvas.getContext('2d');
  indices.forEach((entry, i) => {
    const index = typeof entry === 'number' ? entry : entry.index;
    const frame = spec.frames[index], [x, y, cw, ch] = frame.rect, [rootX, rootY] = frame.root;
    ctx.save(); ctx.beginPath(); ctx.rect(i * stride, 0, stride, height); ctx.clip();
    ctx.translate(i * stride + pad + w / 2, pad + h - 3);
    ctx.scale((frame.flip ? -spec.unit : spec.unit) * (entry.sx || 1), spec.unit * (entry.sy || 1));
    ctx.drawImage(sheet[index], x - rootX, y - rootY, cw, ch); ctx.restore();
  });
  const sourceIndex = texture.source.length;
  texture.source.push(new Phaser.Textures.TextureSource(texture, canvas, canvas.width, height));
  indices.forEach((_, i) => texture.add('motion-' + i, sourceIndex, i * stride, 0, stride, height)
    .setTrim(w, h, -pad, -pad, stride, height));
  if (key.startsWith('desert-mole-') || ['monkey-brown','monkey-red','monkey-blue','monkey-king'].includes(key)) {
    texture.firstFrame = '__BASE'; // Existing portraits and source-image readers keep the original art.
  }
  return indices.map((_, i) => 'motion-' + i);
}

export function registerEnemyMotionTextures(scene) {
  if (scene.registry.get('enemy-motion-assets')) return;
  const specs = scene.cache.json.get('enemy-motion-frames'), result = {};
  const sheets = Object.fromEntries(Object.entries(specs).map(([name, spec]) => [name, readSheet(scene, 'enemy-motion-' + name, spec.frames)]));
  for (const kind of ['red','blue']) sheets['monkey-' + kind] = readSheet(scene, 'enemy-motion-monkey-' + kind, specs.monkey.frames);
  const add = (key, name, indices) => { result[key] = addMotionFrames(scene, key, sheets[name], specs[name] || specs.monkey, indices); };
  add('desert-mole-running', 'mole', [0,1,2,3,0,{index:0,sx:1.008,sy:.992},{index:0,sx:.997,sy:1.003}]);
  add('desert-mole-digging', 'mole', [4,5,6,7]);
  add('desert-mole-charging', 'mole', [8,9]);
  add('desert-mole-attacking', 'mole', [10,11]);
  for (const kind of ['brown','red','blue']) {
    const name = kind === 'brown' ? 'monkey' : 'monkey-' + kind;
    add('monkey-' + kind, name, [0,1,2,3,12,13,14,15]);
    for (const [pose, indices] of [['climbing',[4,5,6,7]], ['throwing',[8,9,10,11]]]) {
      const key = 'monkey-' + kind + '-' + pose;
      scene.textures.createCanvas(key, 150, 150).refresh(); add(key, name, indices);
    }
  }
  add('monkey-king', 'king', [0,1,2,3,0,{index:0,sx:1.008,sy:.992},{index:0,sx:.997,sy:1.003}]);
  for (const [pose, indices] of [['climbing',[4,5,6,7]], ['throwing',[8,9,10,11]]]) {
    const key = 'monkey-king-' + pose; scene.textures.createCanvas(key, 150, 150).refresh(); add(key, 'king', indices);
  }
  scene.registry.set('enemy-motion-assets', result);
  scene.registry.set('enemy-motion-layouts', specs);
}
