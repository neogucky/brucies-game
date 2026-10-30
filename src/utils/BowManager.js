import { JUNGLE_BRANCHES } from "./jungleRules.js";

export const BOW_STATS = { rangeTiles: 10, tileSize: 38, speed: 640,
  gravity: 220, launchY: -65, damage: 1, cooldownMs: 650 };

function touches(x, y, rect, radius = 4) {
  return x + radius > rect.x && x - radius < rect.x + rect.width &&
    y + radius > rect.y && y - radius < rect.y + rect.height;
}

export function getBowTargets(scene) {
  const targets = [];
  const add = (enemy, bounds, damage, aimable = true) => {
    if (!enemy || enemy.active === false || enemy.getData?.("emerging")) return;
    targets.push({ enemy, bounds, damage, aimable });
  };
  if (Array.isArray(scene.monkeys)) {
    [...scene.monkeys, ...(scene.boss ? [scene.boss] : [])].forEach(m =>
      add(m, () => scene.enemyBounds(m), () => scene.damageMonkey(m, BOW_STATS.damage),
        !m.hidden && (!m.isBoss || (m.awake && scene.worldTime < m.vulnerableUntil && m.hitsLeft > 0))));
    scene.hazards?.projectiles.filter(p => p.kind === "stone").forEach(p =>
      add(p, () => ({ x: p.x - p.radius, y: p.y - p.radius, width: p.radius * 2, height: p.radius * 2 }),
        () => scene.hazards.damageStone(p, BOW_STATS.damage)));
  }
  scene.molesGroup?.getChildren().forEach(m => add(m, () => m.getBounds(), () => scene.damageMole(m, BOW_STATS.damage)));
  scene.stoneMonstersGroup?.getChildren().forEach(m => {
    const state = m.getData("stoneState");
    if (["returning", "ready", "perched"].includes(state)) return;
    add(m, () => scene.getStoneMonsterHitbox(m), () => scene.damageStoneMonster(m, BOW_STATS.damage),
      !m.getData("isStoneBoss") || state === "stunned");
  });
  scene.batsGroup?.getChildren().forEach(m => add(m, () => scene.batSystem.getBounds(m), () => scene.batSystem.damage(m, BOW_STATS.damage)));
  scene.monsters?.getChildren().forEach(m => add(m, () => m.getBounds(), () => scene.damageMonster(m, BOW_STATS.damage)));
  return targets;
}

export default class BowManager {
  constructor(scene) {
    this.scene = scene; this.arrows = []; this.effects = new Set();
    this.now = 0; this.nextShotAt = 0;
    this.keyHandler = event => {
      if (event.code === "ShiftLeft" || event.code === "ShiftRight" || event.key === "Shift") this.tryShoot();
    };
    scene.input.keyboard.on("keydown", this.keyHandler);
  }
  isFinished() { return this.scene.isGameOver || this.scene.levelCompleted || this.scene.isComplete; }
  isBlocked(forAttack = true) { return (forAttack && (this.scene.climbingVine || this.scene.hammerCharge?.holding || this.scene.attackInputLocked)) || this.scene.isPaused || this.scene.inventoryOpen || this.scene.confirmation?.isOpen || this.scene.isEditorMode || this.scene.isHitboxEditMode || this.isFinished(); }
  equipped() { return (this.scene.equipped?.secondary === "bow" || this.scene.equipped?.passive === "bow") && Boolean(this.scene.inventory?.passives?.bow); }

  tryShoot() {
    if (!this.equipped() || this.isBlocked() || !this.scene.player?.active || this.now < this.nextShotAt) return false;
    if (this.scene.weaponSwitch) return this.scene.weaponSwitch.request('bow', () => this.fire());
    return this.fire();
  }

  fire() {
    const s = this.scene;
    if (!this.equipped() || this.isBlocked() || !s.player?.active || this.now < this.nextShotAt) return false;
    const jump = s.gameMode === "jump";
    const body = s.player.body;
    const origin = { x: body.x + body.width / 2, y: body.y + body.height / 2 };
    let dx = jump ? (s.facingX || (s.player.flipX ? 1 : -1)) : (s.facing?.x ?? 1);
    let dy = jump ? 0 : (s.facing?.y ?? 0);
    const aimUp = jump && Boolean(s.cursors?.up?.isDown || s.wasd?.W?.isDown);
    let launchY = BOW_STATS.launchY;
    if (aimUp) { dx = 0; dy = -1; launchY = -BOW_STATS.speed; }
    const range = (s.tileSize || BOW_STATS.tileSize) * BOW_STATS.rangeTiles;
    const autoAim = s.autoAimEnabled ?? s.registry?.get("saveData")?.settings?.autoAim;
    if (autoAim && !aimUp) {
      const target = getBowTargets(s).filter(t => t.aimable).map(t => {
        const b = t.bounds(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      }).filter(p => Math.hypot(p.x - origin.x, p.y - origin.y) <= range &&
        (!s.hasLineOfSight || s.hasLineOfSight(origin.x, origin.y, p.x, p.y)))
        .sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y))[0];
      if (target) {
        if (jump) {
          dx = target.x >= origin.x ? 1 : -1;
          const t = Math.max(.12, Math.abs(target.x - origin.x) / BOW_STATS.speed);
          launchY = Math.max(-480, Math.min(300, (target.y - origin.y) / t - .5 * BOW_STATS.gravity * t));
          s.facingX = dx; s.player.setFlipX(dx > 0);
        } else {
          const distance = Math.hypot(target.x - origin.x, target.y - origin.y) || 1;
          dx = (target.x - origin.x) / distance; dy = (target.y - origin.y) / distance;
          s.facing?.set(dx, dy);
        }
      }
    }
    let length = Math.hypot(dx, dy);
    if (!length) { dx = 1; dy = 0; length = 1; }
    dx /= length; dy /= length;
    const x = origin.x + dx * 23, y = origin.y + dy * 23;
    const sprite = s.add.image(x, y, "bow-arrow").setDisplaySize(46, 12).setDepth(24);
    this.arrows.push({ sprite, x, y, vx: dx * BOW_STATS.speed,
      vy: jump ? launchY : dy * BOW_STATS.speed, jump, aimUp, age: 0, distance: 0, range });
    this.nextShotAt = this.now + BOW_STATS.cooldownMs;
    if (s.cache?.audio?.exists('sfx-bow-release')) s.sound.play('sfx-bow-release', { volume: .32 });
    if (s.weaponSwitch) { s.weaponSwitch.aimUp = aimUp; s.weaponSwitch.shotUntil = s.weaponSwitch.now + 300; }
    s.hud?.flashItem("passive");
    if (!s.weaponSwitch) {
    const bow = s.add.image(origin.x + dx * 19, origin.y, "item-bow").setDisplaySize(45, 45).setDepth(25);
    bow.setFlipX(dx < 0); this.effects.add(bow);
    s.tweens.add({ targets: bow, alpha: 0, duration: 220,
      onComplete: () => { this.effects.delete(bow); bow.destroy(); } });
    }
    return true;
  }

  update(deltaSec) {
    if (this.isFinished()) { [...this.arrows].forEach(a => this.remove(a)); return; }
    if (this.isBlocked(false)) return;
    const dt = Math.max(0, Math.min(.05, deltaSec)); this.now += dt * 1000;
    [...this.arrows].forEach(a => this.updateArrow(a, dt));
    if (this.equipped()) {
      const remaining = Math.max(0, this.nextShotAt - this.now);
      this.scene.hud?.setPassiveCooldown({ owned: true, active: !remaining,
        ratio: 1 - remaining / BOW_STATS.cooldownMs });
    }
  }

  updateArrow(a, dt) {
    if (!this.arrows.includes(a)) return;
    if (this.isFinished()) { this.remove(a); return; }
    if (a.jump) a.vy += BOW_STATS.gravity * dt;
    const steps = Math.max(1, Math.ceil(Math.hypot(a.vx, a.vy) * dt / 5));
    for (let i = 0; i < steps; i++) {
      const oldY = a.y;
      const distance = (a.jump && !a.aimUp ? Math.abs(a.vx) : Math.hypot(a.vx, a.vy)) * dt / steps;
      const travel = Math.min(distance, Math.max(0, a.range - a.distance));
      const fraction = distance ? travel / distance : 0;
      a.x += a.vx * dt / steps * fraction; a.y += a.vy * dt / steps * fraction;
      a.distance += travel; a.age += dt / steps * fraction;
      if (this.hitsTerrain(a, oldY)) { this.remove(a); return; }
      const target = getBowTargets(this.scene).find(t => touches(a.x, a.y, t.bounds()));
      if (target) { target.damage(); this.remove(a); return; }
      if (a.distance >= a.range || a.age > 2) { this.remove(a); return; }
    }
    const lift = a.jump ? 0 : Math.max(0, -BOW_STATS.launchY * a.age - .5 * BOW_STATS.gravity * a.age ** 2);
    a.sprite.setPosition(a.x, a.y - lift).setRotation(Math.atan2(a.vy - (a.jump ? 0 : -BOW_STATS.launchY - BOW_STATS.gravity * a.age), a.vx));
  }

  hitsTerrain(a, oldY) {
    const s = this.scene;
    if (s.blockMap) {
      const tile = s.tileSize;
      const block = s.blockMap.get(Math.floor(a.x / tile) + "," + Math.floor(a.y / tile));
      if (block && block.active !== false) return true;
    }
    if (Array.isArray(s.monkeys) && a.vy >= 0) return (s.branches || JUNGLE_BRANCHES).some(p =>
      oldY + 3 <= p.y && a.y + 3 >= p.y && a.x >= p.x && a.x <= p.x + p.width);
    return false;
  }
  remove(a) {
    const index = this.arrows.indexOf(a); if (index < 0) return;
    a.sprite.destroy(); this.arrows.splice(index, 1);
  }
  destroy() {
    this.scene.input.keyboard.off("keydown", this.keyHandler);
    [...this.arrows].forEach(a => this.remove(a));
    this.effects.forEach(e => e.destroy()); this.effects.clear();
  }
}
