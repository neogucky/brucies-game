// Furniture is one fixed texture. Knight poses are separate cutouts, aligned by
// face size and a shared waist/foot baseline instead of resizing every pose.
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
  register('intro-bed-fixed', beds[2], 640, 500, scale);
  const poses = textures.get('intro-knight-poses').getSourceImage(), cellW = poses.width / 4, cellH = poses.height / 2;
  const faces = [[272, 125], [268.5, 124], [265, 121], [257.5, 116], [295, 93], [283, 95], [269.5, 96], [266, 95]];
  ['sleep', 'yawn', 'awake', 'prepare', 'push', 'air', 'land', 'ready'].forEach((name, i) => {
    const key = 'intro-hero-' + name; if (textures.exists(key)) return;
    const c = cutout('intro-knight-poses', [(i % 4) * cellW, Math.floor(i / 4) * cellH, cellW, cellH]);
    const poseScale = 76 / faces[i][1], texture = textures.createCanvas(key, 440, 360);
    texture.getContext().drawImage(c.canvas, 260 - faces[i][0] * poseScale,
      355 - (c.top + c.height) * poseScale, cellW * poseScale, cellH * poseScale);
    texture.refresh();
  });
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
