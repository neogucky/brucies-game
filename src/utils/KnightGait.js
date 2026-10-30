// Each foot has a planted half-cycle and a separate swinging half-cycle. The
// opposite leg is exactly half a turn behind; the same leg cannot always lead.
export function gaitLeg(phase, running = false) {
  const stride = running ? 18 : 13, lift = running ? 15 : 8;
  const hip = { x: 0, y: -(running ? 30 : 33) - (running ? Math.abs(Math.sin(phase)) * 1.5 : Math.cos(phase * 2) * .6) };
  const foot = { x: Math.cos(phase) * stride, y: -10 - Math.max(0, -Math.sin(phase)) * lift };
  const dx = foot.x - hip.x, dy = foot.y - hip.y, distance = Math.hypot(dx, dy);
  // Both gaits use the same short, stocky leg lengths. Running changes the
  // stride and lift instead of stretching the knight's bones.
  const upperLength=12.5, lowerLength=14.5;
  const along=(upperLength**2-lowerLength**2+distance**2)/(2*distance);
  const bend = Math.sqrt(Math.max(0, upperLength**2-along**2));
  const knee = { x: hip.x + dx/distance*along + dy/distance*bend, y: hip.y + dy/distance*along - dx/distance*bend };
  return { hip, knee, foot, planted: Math.sin(phase) >= 0 };
}

export default class KnightGait {
  constructor(scene) {
    this.scene = scene; this.assets = scene.registry.get('level-motion-assets')?.rig;
    this.images = [];
    if (!this.assets) return;
    for (let leg = 0; leg < 2; leg++) for (let part = 0; part < 3; part++) this.images.push(scene.add.image(0, 0, this.assets.parts[0].key).setVisible(false));
    this.phase = 0;
  }
  update({ delta, running, direction, scale, x, feetY, depth, alpha, visible }) {
    if (!this.assets) return;
    this.phase += delta / (running ? 390 : 560) * Math.PI * 2;
    const poses = [gaitLeg(this.phase + Math.PI, running), gaitLeg(this.phase, running)];
    poses.forEach((pose, leg) => {
      const hipOffset = leg ? 5 : -5;
      for (const point of [pose.hip, pose.knee, pose.foot]) point.x += hipOffset;
      const thigh = this.assets.parts[leg ? 0 : 1], shin = this.assets.parts[leg ? 2 : 3], boot = this.assets.parts[leg ? 4 : 5];
      const images = this.images.slice(leg * 3, leg * 3 + 3);
      const world = p => ({ x: x + direction * p.x * scale, y: feetY + p.y * scale });
      const draw = (image, part, a, b) => {
        const start = world(a), end = world(b), size = Math.hypot(end.x - start.x, end.y - start.y) / part.length;
        image.setTexture(part.key).setOrigin(part.originX, part.originY).setPosition(start.x, start.y)
          .setScale(-direction * size, size).setRotation(Math.atan2(end.y - start.y, end.x - start.x) - (direction > 0 ? Math.PI - part.angle : part.angle));
      };
      draw(images[0], thigh, pose.hip, pose.knee); draw(images[1], shin, pose.knee, pose.foot);
      const foot = world(pose.foot);
      // Use the painted parts' native aspect ratio, including the boot cuff.
      // Its ankle pivot keeps the sole planted without flattening the artwork.
      images[2].setTexture(boot.key).setOrigin(.74, .42).setPosition(foot.x, foot.y)
        .setScale(-direction * 19 * scale / boot.width, 19 * scale / boot.width)
        .setRotation(pose.planted ? 0 : direction * -.25 * Math.max(0, -Math.sin(this.phase + (leg ? 0 : Math.PI))));
      images.forEach(image => image.setDepth(depth + leg * .002).setAlpha(alpha).setVisible(visible));
    });
    this.poses = poses;
  }
  hide() { this.images.forEach(image => image.setVisible(false)); }
  destroy() { this.images.forEach(image => image.destroy()); }
}
