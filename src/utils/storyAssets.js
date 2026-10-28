// Keep the generated originals intact. Register the cells as grounded textures
// so every pose shares a stable foot position when the film changes frames.
export function registerStoryTextures(scene) {
  const textures = scene.textures;
  const cell = (key, x, y, width, height) => {
    const canvas = document.createElement('canvas'); canvas.width = Math.ceil(width); canvas.height = Math.ceil(height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(textures.get(key).getSourceImage(), x, y, width, height, 0, 0, width, height);
    const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let left = canvas.width, right = 0, top = canvas.height, bottom = 0;
    for (let row = 0; row < canvas.height; row++) for (let col = 0; col < canvas.width; col++) {
      if (rgba[(row * canvas.width + col) * 4 + 3] < 48) continue;
      left = Math.min(left, col); right = Math.max(right, col); top = Math.min(top, row); bottom = Math.max(bottom, row);
    }
    return { canvas, left, top, width: right - left + 1, height: bottom - top + 1 };
  };
  const group = (source, columns, y, height, names, width = 200, outHeight = 200) => {
    const image = textures.get(source).getSourceImage(), cellWidth = image.width / columns;
    const cells = names.map((_, i) => cell(source, i * cellWidth, y, cellWidth, height));
    const scale = Math.min((width - 14) / Math.max(...cells.map(c => c.width)), (outHeight - 12) / Math.max(...cells.map(c => c.height)));
    cells.forEach((c, i) => {
      if (textures.exists(names[i])) return;
      const t = textures.createCanvas(names[i], width, outHeight);
      t.getContext().drawImage(c.canvas, c.left, c.top, c.width, c.height,
        (width - c.width * scale) / 2, outHeight - 5 - c.height * scale, c.width * scale, c.height * scale); t.refresh();
    });
  };
  const ruin = textures.get('desert-ruin-states').getSourceImage();
  group('desert-ruin-states', 2, 0, ruin.height, ['desert-ruin-v2', 'desert-ruin-repaired-v2'], 360, 260);
  const repairSteps = textures.get('desert-ruin-repair-steps').getSourceImage();
  group('desert-ruin-repair-steps', 2, 0, repairSteps.height, ['desert-ruin-foundation-v3', 'desert-ruin-walls-v3'], 360, 260);
  const shrub = textures.get('desert-shrub-art').getSourceImage();
  group('desert-shrub-art', 1, 0, shrub.height, ['desert-shrub'], 96, 72);
  const poses = textures.get('story-knight-investigate').getSourceImage();
  group('story-knight-investigate', 3, 0, poses.height, ['story-hero-pick', 'story-hero-lift', 'story-hero-read']);
  const gestures = textures.get('story-gestures').getSourceImage(), split = Math.round(gestures.height * .56);
  group('story-gestures', 3, 0, split, ['story-hero-quiet', 'story-hero-inspect', 'story-hero-point']);
  group('story-gestures', 3, split, gestures.height - split, ['story-helper-observe', 'story-helper-beckon', 'story-helper-point'], 160, 160);
}
