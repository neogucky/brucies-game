import { INTRO_BED_FEET, INTRO_BED_PROJECTION, projectIntroBedPoint } from './introBedGeometry.js';

// Furniture, draped bedding and actor are separate layers. The cloth's curved
// hem covers the actor's waist instead of clipping him at a horizontal line.
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
  const bed = textures.get('intro-bed-rug').getSourceImage();
  const projectedBed = (key, source) => {
    if (textures.exists(key)) return;
    const texture = textures.createCanvas(key, 960, 600), ctx = texture.getContext();
    // A vertical-preserving projective registration: each image column stays
    // upright, and all three painted post bottoms land on the carpet guides.
    const matrix = INTRO_BED_PROJECTION;
    for (let x = 0; x < source.width; x += 2) {
      const width = Math.min(2, source.width - x), from = projectIntroBedPoint(matrix, x, 0);
      const to = projectIntroBedPoint(matrix, x + width, source.height);
      ctx.drawImage(source, x, 0, width, source.height, from.x, from.y,
        to.x - from.x + .25, matrix.e * source.height / (matrix.g * x + 1));
    }
    texture.refresh();
  };
  projectedBed('intro-bed-fixed', bed);
  const front = document.createElement('canvas'); front.width = bed.width; front.height = bed.height;
  const frontContext = front.getContext('2d', { willReadFrequently: true }); frontContext.drawImage(bed, 0, 0);
  const data = frontContext.getImageData(0, 0, front.width, front.height), pixels = data.data;
  // Select the actual curved wooden edge of the footboard, including its
  // outline. The cream mattress stays behind the animated cloth and actor.
  for (let x = 0; x < front.width; x++) {
    let top = front.height;
    // The back head post shares a few source columns with the near front
    // post. Start below it so it cannot become a foreground sliver.
    if (x >= 65 && x <= 779) for (let y = x >= 620 ? 490 : 400; y < front.height; y++) {
      const i = (y * front.width + x) * 4, r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];
      if (a >= 220 && r - g > 30 && g - b > 25) { top = y - 5; break; }
    }
    for (let y = 0; y < Math.max(0, top); y++) pixels[(y * front.width + x) * 4 + 3] = 0;
  }
  frontContext.putImageData(data, 0, 0); projectedBed('intro-bed-front', front);
  // Cloth textures are registered separately below, retaining a curved neck hem.
  registerIntroCloth(textures);
  if (!textures.exists('intro-bed-ground-shadow')) {
    const texture = textures.createCanvas('intro-bed-ground-shadow', 960, 600), ctx = texture.getContext();
    const feet = Object.values(INTRO_BED_FEET);
    ctx.save(); ctx.shadowColor = 'rgba(31, 19, 17, .3)'; ctx.shadowBlur = 12;
    ctx.shadowOffsetX = -8; ctx.shadowOffsetY = 4; ctx.fillStyle = 'rgba(31, 19, 17, .22)';
    ctx.beginPath(); feet.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath(); ctx.fill(); ctx.restore();
    for (const foot of feet) {
      ctx.save(); ctx.translate(foot.x, foot.y); ctx.scale(25, 6);
      const gradient = ctx.createRadialGradient(0, 0, .06, 0, 0, 1);
      gradient.addColorStop(0, 'rgba(29, 17, 14, .65)'); gradient.addColorStop(.42, 'rgba(29, 17, 14, .34)');
      gradient.addColorStop(1, 'rgba(29, 17, 14, 0)'); ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    texture.refresh();
  }
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

function registerIntroCloth(textures) {
  const cloth = textures.get('intro-blanket-layers').getSourceImage();
  for (const [i, name, y] of [[0, 'occupied', 322], [1, 'empty', 328.2]]) {
    const key = 'intro-blanket-' + name;
    if (textures.exists(key)) continue;
    const texture = textures.createCanvas(key, 960, 600);
    texture.getContext().drawImage(cloth, 0, i * 512, 1536, 512, 30, y, 1536 * .31, 512 * .31);
    texture.refresh();
  }
}
