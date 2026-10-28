const ATLASES = {
  desert: { columns: 3, names: ['ruin', 'shop', 'oasis', 'quarry', 'tunnel', 'expert'] },
  underground: { columns: 3, names: ['dig', 'shop', 'gate', 'open-gate', 'depths', 'expert'] },
  jungle: { columns: 2, names: ['canopy', 'vines', 'shop', 'expert'] },
};

// Normalize transparent landmarks to one ground baseline without stretching
// their architecture. The source sheets contain places, without display bases.
export function registerWorldMapMarkers(scene) {
  for (const [world, atlas] of Object.entries(ATLASES)) {
    const source = scene.textures.get('map-places-' + world).getSourceImage();
    const width = Math.floor(source.width / atlas.columns), height = Math.floor(source.height / 2);
    atlas.names.forEach((name, i) => {
      const key = `map-${world}-${name}`; if (scene.textures.exists(key)) return;
      const cell = document.createElement('canvas'); cell.width = width; cell.height = height;
      const ctx = cell.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(source, i % atlas.columns * width, Math.floor(i / atlas.columns) * height, width, height, 0, 0, width, height);
      const data = ctx.getImageData(0, 0, width, height).data;
      let left = width, top = height, right = 0, bottom = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] < 64) continue;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      const w = right - left + 1, h = bottom - top + 1, scale = Math.min(160 / w, 134 / h);
      const texture = scene.textures.createCanvas(key, 180, 150);
      texture.getContext().drawImage(cell, left, top, w, h, (180 - w * scale) / 2, 146 - h * scale, w * scale, h * scale);
      texture.refresh();
    });
  }
}

export function addWorldMapMarker(scene, world, node, key, onChoose) {
  const save = scene.registry.get('saveData') || {}, open = scene.unlocked.has(node.id);
  const completed = save.completedLevels?.includes(node.id);
  const baseY = node.y + (node.markerOffsetY ?? 24);
  const shadow = scene.add.ellipse(node.x, baseY - 3, 106, 16, world === 'desert' ? 0x8b6337 : 0x121d19, .2).setDepth(0).setVisible(open);
  const icon = scene.add.image(node.x, baseY, key).setOrigin(.5, 1).setDepth(2).setVisible(open);
  const label = scene.add.text(node.x, node.y + (node.labelOffsetY ?? 49), node.label + (completed ? ' ✓' : ''), {
    fontFamily: 'Trebuchet MS, sans-serif', fontSize: '18px', color: '#fff1cb',
    stroke: world === 'jungle' ? '#1f3826' : '#3b2b20', strokeThickness: 4,
  }).setOrigin(.5).setDepth(6).setVisible(open);
  for (const object of [icon, label]) object.setInteractive({ useHandCursor: true }).on('pointerdown', onChoose);
  const extras = node.bonusWorld ? [scene.add.image(node.x + 43, node.y - 43, 'ui-coin').setDisplaySize(33, 33).setDepth(3).setVisible(open)] : [];
  return { icon, label, shadow, extras };
}
