// Variant B's near-side view uses complete painted poses. Its far-side arm is
// drawn behind the matching torso in MeleeAnimation, so the shoulder is hidden.
export function registerSwordTextures(scene) {
  if (scene.registry.get('sword-animation-assets')) return;
  const metadata = scene.cache.json.get('sword-b-frames'), sequences = {};
  for (const [id, sequence] of Object.entries(metadata)) {
    const source = scene.textures.get('sword-b-' + id).getSourceImage();
    const frames = sequence.frames.map((frame, index) => {
      const [x, y, width, height] = frame.rect, [rootX, rootY] = frame.root;
      const cutout = document.createElement('canvas'); cutout.width = width; cutout.height = height;
      const cut = cutout.getContext('2d'); cut.drawImage(source, x, y, width, height, 0, 0, width, height);
      const mask = document.createElement('canvas'); mask.width = width; mask.height = height;
      const ink = mask.getContext('2d'); ink.fillStyle = '#fff';
      for (const [row, start, length] of frame.runs) ink.fillRect(start, row, length, 1);
      cut.globalCompositeOperation = 'destination-in'; cut.drawImage(mask, 0, 0);
      const key = 'sword-b-' + id + '-' + index, texture = scene.textures.createCanvas(key, 320, 202);
      const scale = sequence.pixelScale;
      texture.getContext().drawImage(cutout, 160 + (x - rootX) * scale, 187 + (y - rootY) * scale, width * scale, height * scale);
      texture.refresh(); return { key };
    });
    sequences[id] = { frames, maxReach: sequence.maxReach };
  }
  scene.registry.set('sword-animation-assets', { sequences });
}

export function swordStance(scene) {
  const body = scene.player.body;
  // A held Down key in mid-air is not a grounded crouch.
  if (body && !body.blocked?.down && !body.touching?.down) return 'jump';
  return scene.isDucking ? 'crouch' : 'stand';
}

export function swordFrameIndex(elapsed, swingMs, frameCount, recovery = null) {
  if (recovery !== null) return frameCount - (recovery < .5 ? 2 : 1);
  const t = Math.max(0, Math.min(.999999, elapsed / swingMs));
  // The final two painted poses are recovery only, never another damage hit.
  return Math.min(frameCount - 3, Math.floor(t * (frameCount - 2)));
}

export default class SwordAnimation {
  constructor(scene) {
    this.scene = scene; this.assets = scene.registry.get('sword-animation-assets');
    if (!this.assets?.sequences) return;
    this.body = scene.add.image(0, 0, this.assets.sequences['male-stand'].frames[0].key).setOrigin(.5, 190 / 202).setVisible(false);
  }
  hide() { this.body?.setVisible(false); }
  draw({ state, stats, hit, direction, scale, feetY, recovery = null }) {
    const s = this.scene, p = s.player, stance = swordStance(s);
    const gender = s.registry.get('saveData')?.playerGender === 'female' ? 'female' : 'male';
    const sequence = this.assets.sequences[gender + '-' + stance];
    const index = swordFrameIndex(state.elapsed, stats.swingMs, sequence.frames.length, recovery);
    const reach = direction > 0 ? hit.x + hit.width - p.x : p.x - hit.x;
    // Register all frames to one fixed boot anchor. Fit the longest visible cut
    // to real reach without resizing the sword or squeezing the painted limbs.
    const offsetX = reach - sequence.maxReach * scale;
    const frame = sequence.frames[index];
    this.body.setTexture(frame.key).setPosition(p.x + direction * offsetX, feetY)
      .setScale(scale).setFlipX(false).setRotation(0)
      .setAlpha(p.alpha).setDepth(p.depth + .01).setVisible(p.visible);
    return { renderer: 'sword-b', stance, frame: frame.key, frameIndex: index, direction, x: p.x,
      feetY, scale, offsetX, phase: { stage: state.recoveryElapsed === undefined ? 'strike' : 'recovery' } };
  }
  destroy() { this.body?.destroy(); }
}
