import { animationPaused } from './PlayerAnimation.js';

export default class LevelEffects {
  constructor(scene) {
    this.scene = scene; this.fruits = new WeakSet(); this.particles = []; this.clock = 0;
    if (scene.blocks?.remove) {
      this.remove = scene.blocks.remove;
      scene.blocks.remove = (block, ...args) => {
        if (block?.active && !scene.isEditorMode && Math.hypot(block.x - scene.player.x, block.y - scene.player.y) < 270) this.crumble(block);
        return this.remove.call(scene.blocks, block, ...args);
      };
    }
  }
  crumble(block) {
    const s = this.scene, key = block.texture?.key;
    if (!key || /onyx|black/.test(key)) return;
    const source = s.textures.get(key).getSourceImage();
    if (!source?.width) return;
    const tile = block.displayWidth, cx = block.x + tile * (.5 - block.originX), cy = block.y + tile * (.5 - block.originY);
    for (let i = 0; i < 7; i++) {
      const cutKey = 'crumb-' + key + '-' + i;
      if (!s.textures.exists(cutKey)) {
        const texture = s.textures.createCanvas(cutKey, 14, 14), ctx = texture.getContext();
        ctx.drawImage(source, (i % 3) * source.width / 3, Math.floor(i / 3) * source.height / 3,
          source.width / 4, source.height / 4, 0, 0, 14, 14); texture.refresh();
      }
      const image = s.add.image(cx + (i % 3 - 1) * tile * .2, cy, cutKey).setDisplaySize(5 + i % 3 * 2, 5 + i % 3 * 2).setDepth(12);
      this.addParticle({ image, vx: (i - 3) * 34, vy: -85 - (i % 3) * 28, life: 480, spin: (i - 3) * .008 });
    }
  }
  addParticle(particle) {
    if (this.particles.length >= 90) this.particles.shift().image.destroy();
    this.particles.push({ age: 0, gravity: 470, ...particle });
  }
  burst(x, y, color = 0xffdf76, depth = 8) {
    for (let i = 0; i < 5; i++) {
      const image = this.scene.add.circle(x, y, 1.5, color).setDepth(depth);
      this.addParticle({ image, vx: Math.cos(i * 1.256) * 35, vy: -30 + Math.sin(i * 1.256) * 25, life: 360, gravity: 70, spin: 0 });
    }
  }
  update(delta = 16) {
    const s = this.scene; if (animationPaused(s)) return;
    const dt = Math.min(50, Math.max(0, delta)); this.clock += dt;
    s.fruits?.getChildren().forEach(fruit => {
      if (!fruit.active || this.fruits.has(fruit)) return;
      this.fruits.add(fruit);
      const sx = fruit.scaleX, sy = fruit.scaleY;
      // Scale only the picture. Its static collection body stays unchanged.
      fruit.setScale(sx * .15, sy * .15);
      s.tweens.add({ targets: fruit, scaleX: sx, scaleY: sy, duration: 430, ease: 'Back.Out' });
      this.burst(fruit.x, fruit.y, 0xa5d45a, fruit.depth - .01);
    });
    this.particles = this.particles.filter(p => {
      p.age += dt;
      if (!p.image.active || p.age >= p.life) { p.image.destroy(); return false; }
      p.vy += p.gravity * dt / 1000; p.image.x += p.vx * dt / 1000; p.image.y += p.vy * dt / 1000;
      p.image.rotation += (p.spin || 0) * dt; p.image.setAlpha(1 - p.age / p.life);
      return true;
    });
    const motion = s.playerAnimation;
    if (motion?.state === 'land' && motion.elapsed === 0 && !s.isGameOver) this.burst(s.player.x, s.player.body.bottom - 2, 0xd1bd92, s.player.depth - .01);
  }
  destroy() { if (this.remove && this.scene.blocks) this.scene.blocks.remove = this.remove; this.particles.forEach(p => p.image.destroy()); this.particles = []; }
}
