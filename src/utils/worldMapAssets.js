// Extract disconnected poses, preserving alpha. Some cape/boot tips extend a
// few pixels over the nominal atlas cells, so a rectangular crop would leak a
// neighboring pose into the frame.
function atlasPoses(source) {
  const canvas = document.createElement("canvas"); canvas.width = source.width; canvas.height = source.height;
  const context = canvas.getContext("2d", { willReadFrequently: true }); context.drawImage(source, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const width = canvas.width, height = canvas.height, visited = new Uint8Array(width * height), poses = [];
  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || pixels.data[start * 4 + 3] < 16) continue;
    const stack = [start], indices = []; visited[start] = 1;
    let left = width, right = 0, top = height, bottom = 0;
    while (stack.length) {
      const index = stack.pop(), x = index % width, y = Math.floor(index / width);
      indices.push(index); left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (const next of [index - 1, index + 1, index - width, index + width]) {
        if (next < 0 || next >= visited.length || visited[next] || Math.abs(next % width - x) > 1 || pixels.data[next * 4 + 3] < 16) continue;
        visited[next] = 1; stack.push(next);
      }
    }
    if (indices.length < 500) continue;
    const cutout = document.createElement("canvas"); cutout.width = right - left + 1; cutout.height = bottom - top + 1;
    const cutContext = cutout.getContext("2d"), cutPixels = cutContext.createImageData(cutout.width, cutout.height);
    indices.forEach(index => {
      const target = ((Math.floor(index / width) - top) * cutout.width + index % width - left) * 4;
      cutPixels.data.set(pixels.data.subarray(index * 4, index * 4 + 4), target);
    });
    cutContext.putImageData(cutPixels, 0, 0);
    poses.push({ image: cutout, left, top, bottom: bottom + 1,
      row: top < source.height / 2 ? 0 : 1 });
  }
  return poses.sort((a, b) => a.row - b.row || a.left - b.left);
}

export function registerWorldMapAnimationTextures(scene) {
  const walk = scene.textures.get("knight-walk-atlas").getSourceImage(), steps = atlasPoses(walk);
  const walkScale = 144 / Math.max(...steps.map(p => p.image.height));
  const baselines = [0, 1].map(row => Math.max(...steps.filter(p => p.row === row).map(p => p.bottom)));
  steps.forEach((pose, index) => {
    const row = Math.floor(index / 6), column = index % 6;
    const key = `knight${row ? "-female" : ""}-walk-${column}`;
    if (scene.textures.exists(key)) return;
    const texture = scene.textures.createCanvas(key, 150, 150);
    const center = walk.width * (column + .5) / 6 + 18;
    texture.getContext().drawImage(pose.image, 75 + (pose.left - center) * walkScale,
      147 + (pose.top - baselines[row]) * walkScale, pose.image.width * walkScale, pose.image.height * walkScale);
    texture.refresh();
  });

  const drink = scene.textures.get("companion-drink-atlas").getSourceImage(), sips = atlasPoses(drink);
  const drinkScale = 44 / Math.max(...sips.map(p => p.image.width));
  sips.forEach((pose, index) => {
    const key = `companion-drinking-${index}`;
    if (scene.textures.exists(key)) return;
    const texture = scene.textures.createCanvas(key, 50, 50);
    texture.getContext().drawImage(pose.image, (50 - pose.image.width * drinkScale) / 2,
      48 - pose.image.height * drinkScale, pose.image.width * drinkScale, pose.image.height * drinkScale);
    texture.refresh();
  });
}

export function registerClimbMantleTextures(scene) {
  const source = scene.textures.get('mantle-atlas').getSourceImage(), poses = atlasPoses(source);
  const scale = 144 / Math.max(...poses.map(p => p.image.height));
  poses.forEach((pose, index) => {
    const key = `knight${index >= 4 ? '-female' : ''}-mantle-${index % 4}`;
    if (scene.textures.exists(key)) return;
    const texture = scene.textures.createCanvas(key, 150, 150), context = texture.getContext();
    // All gameplay poses face left before flipX is applied. Keep one scale for
    // the full sequence so the crouching knight does not grow between frames.
    context.translate(150, 0); context.scale(-1, 1);
    context.drawImage(pose.image, (150 - pose.image.width * scale) / 2,
      147 - pose.image.height * scale, pose.image.width * scale, pose.image.height * scale);
    texture.refresh();
  });
}
