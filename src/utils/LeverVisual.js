// The original transparent sheets remain intact. Phaser frames select the
// painted mount and separate arm so the same art works in the level and closeup.
export const LEVER_PIVOT_HEIGHT = 24;
export const LEVER_ART = {
  desert: { key: 'secret-lever-desert', depth: 2,
    base: { frame: [117, 563, 893, 409], pivot: [433, 115] },
    arm: { frame: [1215, 56, 133, 873], pivot: [73, 829], grip: [67, 108] } },
  underground: { key: 'secret-lever-underground', depth: -.5,
    base: { frame: [162, 530, 860, 425], pivot: [466, 93] },
    arm: { frame: [1223, 49, 129, 890], pivot: [61, 835], grip: [62, 105] } },
  jungle: { key: 'secret-lever-jungle', depth: 2,
    base: { frame: [144, 559, 848, 406], pivot: [442, 79] },
    arm: { frame: [1159, 49, 128, 897], pivot: [49, 838], grip: [62, 118] } },
};

export function registerLeverTextures(scene) {
  for (const { key, base, arm } of Object.values(LEVER_ART)) {
    const texture = scene.textures.get(key);
    if (!texture.has('base')) texture.add('base', 0, ...base.frame);
    if (!texture.has('arm')) texture.add('arm', 0, ...arm.frame);
  }
}

export default class LeverVisual {
  constructor(scene, world, x, y, scale = 1, container = null) {
    this.skin = LEVER_ART[world]; this.x = x; this.y = y; this.scale = scale; this.visible = true;
    // At gameplay size the painted shaft needs a stronger silhouette. The
    // closeup keeps the original proportions and its existing hand animation.
    this.armWidth = container ? 1 : 2.25;
    const { key, base, arm, depth } = this.skin;
    this.pivot = { x, y: y - LEVER_PIVOT_HEIGHT * scale };
    this.base = scene.add.image(this.pivot.x, this.pivot.y, key, 'base')
      .setOrigin(base.pivot[0] / base.frame[2], base.pivot[1] / base.frame[3])
      .setScale(LEVER_PIVOT_HEIGHT * scale / (base.frame[3] - base.pivot[1])).setDepth(depth);
    this.arm = scene.add.image(this.pivot.x, this.pivot.y, key, 'arm')
      .setOrigin(arm.pivot[0] / arm.frame[2], arm.pivot[1] / arm.frame[3]).setDepth(depth);
    this.images = [this.base, this.arm];
    if (container) { this.images.forEach(image => image.setScrollFactor(0)); container.add(this.images); }
  }

  draw(handle) {
    const { pivot, grip } = this.skin.arm;
    const dx = (grip[0] - pivot[0]) * this.armWidth, dy = grip[1] - pivot[1];
    const targetX = handle.x - this.pivot.x, targetY = handle.y - this.pivot.y;
    const scale = Math.hypot(targetX, targetY) / Math.hypot(dx, dy);
    this.arm.setScale(scale * this.armWidth, scale)
      .setRotation(Math.atan2(targetY, targetX) - Math.atan2(dy, dx));
    this.handle = { ...handle };
  }

  setVisible(visible) { this.visible = visible; this.images.forEach(image => image.setVisible(visible)); }
  destroy() { this.images.forEach(image => image.destroy()); }
}
