// The bed frames share a scale and floor line, keeping the furniture in place
// when the knight sits up. The cutout rectangles include transparent gutters.
export function registerIntroTextures(scene) {
  const textures = scene.textures;
  const cutout = (sourceKey, rect) => {
    const canvas = document.createElement('canvas'); canvas.width = rect[2]; canvas.height = rect[3];
    canvas.getContext('2d').drawImage(textures.get(sourceKey).getSourceImage(), ...rect, 0, 0, rect[2], rect[3]);
    const ctx = canvas.getContext('2d'), data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let left = canvas.width, top = canvas.height, right = 0, bottom = 0;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] < 64) continue;
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    return { canvas, left, top, width: right - left + 1, height: bottom - top + 1 };
  };
  const register = (key, c, width, height, scale) => {
    if (textures.exists(key)) return;
    const texture = textures.createCanvas(key, width, height);
    texture.getContext().drawImage(c.canvas, c.left, c.top, c.width, c.height,
      (width - c.width * scale) / 2, height - 5 - c.height * scale, c.width * scale, c.height * scale);
    texture.refresh();
  };
  const beds = [[0, 0, 768, 550], [768, 0, 768, 540], [0, 550, 768, 474]].map(r => cutout('intro-bed-atlas', r));
  // The next cell's sword tip enters this gutter; the bed's feet lie to its right.
  beds[1].canvas.getContext('2d').clearRect(0, 537, 400, 3);
  const scale = Math.min(620 / Math.max(...beds.map(c => c.width)), 490 / Math.max(...beds.map(c => c.height)));
  ['sleep', 'yawn', 'empty'].forEach((name, i) => register('intro-bed-' + name, beds[i], 640, 500, scale));
  const awakeSource = textures.get('intro-bed-awake-source').getSourceImage();
  const awake = cutout('intro-bed-awake-source', [0, 0, awakeSource.width, awakeSource.height]);
  register('intro-bed-awake', awake, 640, 500, Math.min(620 / awake.width, 490 / awake.height));
  const knight = cutout('intro-bed-atlas', [940, 540, 480, 484]);
  register('intro-knight-ready', knight, 220, 260, Math.min(210 / knight.width, 250 / knight.height));
  ['sleep', 'awake', 'peek', 'hop'].forEach((name, i) => {
    const c = cutout('intro-helper-atlas', [(i % 2) * 768, Math.floor(i / 2) * 512, 768, 512]);
    register('intro-helper-' + name, c, 160, 160, Math.min(148 / c.width, 148 / c.height));
  });
  const dragon = textures.get('intro-dragon-atlas').getSourceImage(), cell = dragon.width / 2;
  for (let i = 0; i < 2; i++) {
    const key = 'intro-dragon-' + i; if (textures.exists(key)) continue;
    const texture = textures.createCanvas(key, 640, 484);
    texture.getContext().drawImage(dragon, i * cell, 0, cell, dragon.height, 0, 0, 640, 484); texture.refresh();
  }
}
