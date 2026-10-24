import { MONKEY_TYPES, STICKY_MS, ballisticVelocity, circleTouchesRect, secondsLeft } from "./jungleRules.js";

export default class JungleHazards {
  constructor(scene, surfaces) {
    this.scene = scene;
    this.surfaces = surfaces;
    this.projectiles = [];
    this.puddles = [];
    this.slowUntil = 0;
  }

  get now() { return this.scene.worldTime ?? this.scene.time.now; }

  throw(kind, from, target) {
    const stone = kind === "stone";
    const sprite = this.scene.add.image(from.x, from.y, stone
      ? "underground-stonemonster-rolledup" : "coconut-" + kind)
      .setDisplaySize(stone ? 44 : 25, stone ? 44 : 25).setDepth(14);
    const velocity = ballisticVelocity(from, target);
    const projectile = { sprite, kind, x: from.x, y: from.y, vx: velocity.x,
      vy: velocity.y, radius: stone ? 18 : 10, bornAt: this.now,
      rollDir: target.x >= from.x ? 1 : -1, rollDistance: 0, hp: 3 };
    this.projectiles.push(projectile);
    return projectile;
  }

  update(dt) {
    if (this.scene.isPaused || this.scene.isGameOver || this.scene.levelCompleted) return;
    dt = Math.max(0, Math.min(dt, .05));
    [...this.projectiles].forEach(p => this.updateProjectile(p, dt));
    this.updatePuddles();
  }

  updateProjectile(p, dt) {
    const now = this.now;
    if (now - p.bornAt > 8000 || p.x < -60 || p.x > 1020 || p.y > 660) {
      this.remove(p); return;
    }
    if (now < (p.stunnedUntil || 0)) return;
    p.vy += 850 * dt;
    const steps = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy) * dt / 6));
    for (let i = 0; i < steps; i += 1) {
      const oldBottom = p.y + p.radius;
      p.x += p.vx * dt / steps;
      p.y += p.vy * dt / steps;
      if (p.rolling) p.rollDistance += Math.abs(p.vx * dt / steps);
      const floor = p.vy >= 0 && this.surfaces.find(s =>
        oldBottom <= s.y + .5 && p.y + p.radius >= s.y &&
        p.x >= s.x && p.x <= s.x + s.width);
      if (floor) {
        if (p.kind !== "stone") { this.smash(p, floor.y); return; }
        p.y = floor.y - p.radius;
        p.vy = 0;
        p.vx = p.rollDir * 210;
        p.rolling = true;
      }
      const body = this.scene.player?.body;
      if (body && circleTouchesRect(p.x, p.y, p.radius, body)) {
        if (p.kind === "red") this.explode(p.x, p.y);
        else this.scene.takeJungleHit(p.kind === "stone" ? 1 : MONKEY_TYPES[p.kind].damage);
        this.remove(p); return;
      }
      if (p.rollDistance >= 380) { this.remove(p); return; }
    }
    p.sprite.setPosition(p.x, p.y);
    p.sprite.angle += p.vx * dt * (p.kind === "stone" ? 2.7 : 1.2);
  }

  smash(p, floorY) {
    const spec = MONKEY_TYPES[p.kind];
    if (spec.explosive) this.explode(p.x, floorY - 8);
    if (spec.sticky) this.addPuddle(p.x, floorY);
    const fragments = this.scene.add.ellipse(p.x, floorY - 3, 28, 9,
      p.kind === "blue" ? 0xa4ddff : 0xe8cf9a, .9).setDepth(15);
    this.scene.tweens.add({ targets: fragments, alpha: 0, scaleX: 1.8, duration: 300,
      onComplete: () => fragments.destroy() });
    this.remove(p);
  }

  explode(x, y) {
    const blast = this.scene.add.circle(x, y, 75, 0xff8a38, .5).setDepth(15);
    this.scene.tweens.add({ targets: blast, scale: 1.3, alpha: 0, duration: 300,
      onComplete: () => blast.destroy() });
    this.scene.playJungleSound?.("sfx-explosion");
    if (this.scene.player?.body && circleTouchesRect(x, y, 75, this.scene.player.body)) {
      this.scene.takeJungleHit(2);
    }
  }

  addPuddle(x, y) {
    // Keep repeated throws on one spot readable without stacking countdowns.
    const existing = this.puddles.find(p => Math.abs(p.x - x) < 35 && Math.abs(p.y - y) < 2);
    if (existing) { existing.expiresAt = this.now + STICKY_MS; return existing; }
    const sprite = this.scene.add.image(x, y + 1, "coconut-puddle")
      .setDisplaySize(86, 22).setDepth(12);
    const label = this.scene.add.text(x, y - 21, "Kleber · 5s", {
      fontFamily: "Trebuchet MS, sans-serif", fontSize: "13px", color: "#fff3ba",
      backgroundColor: "#39422c", padding: { x: 4, y: 1 },
    }).setOrigin(.5).setDepth(16);
    const puddle = { x, y, sprite, label, expiresAt: this.now + STICKY_MS, inside: false };
    this.puddles.push(puddle);
    return puddle;
  }

  updatePuddles() {
    const now = this.now, body = this.scene.player?.body;
    [...this.puddles].forEach(p => {
      if (now >= p.expiresAt) {
        p.sprite.destroy(); p.label.destroy();
        this.puddles.splice(this.puddles.indexOf(p), 1); return;
      }
      p.label.setText("Kleber · " + secondsLeft(p.expiresAt, now) + "s");
      const inside = Boolean(body && body.x + body.width > p.x - 40 && body.x < p.x + 40 &&
        body.y + body.height >= p.y - 5 && body.y + body.height <= p.y + 12);
      if (inside && !p.inside) this.slowUntil = now + STICKY_MS;
      p.inside = inside;
    });
  }

  isSticky() { return this.now < this.slowUntil; }

  damageStone(p, damage) {
    if (!this.projectiles.includes(p) || p.kind !== "stone") return;
    p.hp -= damage;
    if (p.hp <= 0) this.remove(p);
    else p.stunnedUntil = this.now + 500;
  }

  remove(p) {
    const index = this.projectiles.indexOf(p);
    if (index < 0) return;
    p.sprite.destroy(); this.projectiles.splice(index, 1);
  }

  destroy() {
    [...this.projectiles].forEach(p => this.remove(p));
    this.puddles.forEach(p => { p.sprite.destroy(); p.label.destroy(); });
    this.puddles.length = 0; this.slowUntil = 0;
  }
}
