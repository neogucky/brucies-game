import { HAMMER_CHARGE, hammerAttackForHold } from './hammerRules.js';
import { getWeaponDamage, getAttackStats } from './weapons.js';

function distanceToRect(x, y, rect) {
  return Math.hypot(Math.max(rect.x - x, 0, x - rect.x - rect.width),
    Math.max(rect.y - y, 0, y - rect.y - rect.height));
}

export function hammerWaveTargets(scene) {
  const targets = [];
  const add = (enemy, bounds, stone, damage) => {
    if (enemy?.active !== false && bounds) targets.push({ enemy, bounds, stone, damage });
  };
  for (const m of [...(scene.monkeys || []), ...(scene.boss ? [scene.boss] : [])]) {
    if (!m.hidden) add(m, scene.enemyBounds(m), false, amount => scene.damageMonkey(m, amount));
  }
  for (const [group, stone, bounds, damage] of [
    [scene.molesGroup, false, m => m.getBounds(), (m, n) => scene.damageMole(m, n)],
    [scene.stoneMonstersGroup, true, m => scene.getStoneMonsterHitbox(m), (m, n) => scene.damageStoneMonster(m, n)],
    [scene.batsGroup, false, m => scene.batSystem.getBounds(m), (m, n) => scene.batSystem.damage(m, n)],
    [scene.monsters, false, m => m.getBounds(), (m, n) => scene.damageMonster(m, n)],
  ]) for (const enemy of group?.getChildren?.() || []) {
    if (enemy.active && !enemy.getData?.('emerging')) add(enemy, bounds(enemy), stone, n => damage(enemy, n));
  }
  for (const p of scene.hazards?.projectiles || []) if (p.kind === 'stone') {
    add(p, { x: p.x - p.radius, y: p.y - p.radius, width: p.radius * 2, height: p.radius * 2 },
      true, n => scene.hazards.damageStone(p, n));
  }
  return targets;
}

export function applyHammerWave(scene, attack, hits = scene.swingHits || scene.swordHitTargets || new Set()) {
  const x = scene.player.x, y = scene.player.body?.bottom ?? scene.player.y, radius = HAMMER_CHARGE.waveRadius;
  for (const t of hammerWaveTargets(scene)) {
    if (hits.has(t.enemy) || distanceToRect(x, y, t.bounds) > radius) continue;
    const targetX = t.bounds.x + t.bounds.width / 2, targetY = t.bounds.y + t.bounds.height / 2;
    if (scene.hasLineOfSight && !scene.hasLineOfSight(x, y - 4, targetX, targetY)) continue;
    hits.add(t.enemy); t.damage(getWeaponDamage('powerHammer', t.stone, attack.multiplier));
  }
  const wave = scene.add.ellipse(x, y, radius * 2, 30, 0x77dbff, .5).setDepth((scene.player.depth || 0) + .1).setScale(.2);
  scene.tweens.add({ targets: wave, scaleX: 1.15, scaleY: 1.5, alpha: 0, duration: 300, onComplete: () => wave.destroy() });
  scene.cameras?.main?.shake?.(100, .003);
  scene.sound?.play?.('sfx-stone-hit', { volume: .3 });
}

export default class HammerCharge {
  constructor(scene) {
    this.scene = scene; this.holding = false; this.ready = false; this.elapsed = 0; this.sequence = 0;
    this.attackMethod = scene.sys?.settings?.key === 'UndergroundDigScene' ? 'digBlock' : scene.swingSword ? 'swingSword' : 'startSwing';
    this.releaseKey = () => this.release(); scene.input?.keyboard?.on?.('keyup-SPACE', this.releaseKey);
    this.graphics = scene.add.graphics().setVisible(false);
    this.label = scene.add.text(0, 0, '', { fontFamily: 'Trebuchet MS', fontSize: '12px', fontStyle: 'bold',
      color: '#ffdf52', stroke: '#192c3c', strokeThickness: 3 }).setOrigin(.5).setVisible(false);
  }
  blocked() {
    const s = this.scene;
    return s.attackInputLocked || s.climbingVine || s.isPaused || s.inventoryOpen || s.isEditorMode || s.isHitboxEditMode
      || s.confirmation?.isOpen || s.isGameOver || s.levelCompleted || s.isComplete;
  }
  press() {
    const s = this.scene;
    if (this.blocked() || s.isSwinging || s.hammerSlamActive || this.holding || this.pendingRelease) return false;
    if (s.equipped?.weapon !== 'powerHammer') { s[this.attackMethod](); return true; }
    this.holding = true; this.ready = false; this.elapsed = 0; this.pendingRelease = false; this.lastStage = 'normal';
    const token = ++this.sequence;
    const begin = () => {
      if (token !== this.sequence || this.blocked() || s.equipped.weapon !== 'powerHammer') { this.cancel(); return; }
      this.ready = true;
      if (this.pendingRelease) { this.pendingRelease = false; this.fire(hammerAttackForHold(0)); }
    };
    if (s.weaponSwitch) s.weaponSwitch.request('melee', begin); else begin();
    return true;
  }
  release() {
    if (!this.holding) return false;
    if (this.blocked() || this.scene.equipped?.weapon !== 'powerHammer') { this.cancel(); return false; }
    this.holding = false;
    if (!this.ready) { this.pendingRelease = true; return true; }
    return this.fire(hammerAttackForHold(this.elapsed));
  }
  fire(attack) {
    const s = this.scene;
    this.ready = false; this.stopEffects();
    if (this.blocked() || s.isSwinging || s.hammerSlamActive || s.equipped?.weapon !== 'powerHammer') return false;
    s[this.attackMethod](attack);
    if (!s.isSwinging || s.hammerAttack !== attack) return false;
    this.lastAttack = attack; this.onAttack?.(attack);
    if (attack.superCharge) this.pendingWave = { attack, remaining: getAttackStats('powerHammer', attack).impactMs };
    return true;
  }
  update(dt) {
    const s = this.scene;
    if (this.pendingWave && !s.isPaused && !s.inventoryOpen && !s.time?.paused) {
      this.pendingWave.remaining -= Math.max(0, Math.min(.05, dt)) * 1000;
      if (this.pendingWave.remaining <= 0) {
        const { attack } = this.pendingWave; this.pendingWave = null;
        if (!s.isGameOver && !s.levelCompleted && !s.climbingVine && !s.hammerSlamActive
          && s.equipped?.weapon === 'powerHammer' && s.isSwinging && s.hammerAttack === attack) applyHammerWave(s, attack);
      }
    }
    if ((!this.holding && !this.pendingRelease) || !this.ready) return;
    if (this.blocked() || this.scene.equipped?.weapon !== 'powerHammer') { this.cancel(); return; }
    this.elapsed += Math.max(0, Math.min(.05, dt)) * 1000;
    const stage = hammerAttackForHold(this.elapsed);
    if (stage.charged && !this.hum) {
      try { this.hum = this.scene.sound?.add?.('sfx-charging', { loop: true, volume: .12 }); this.hum?.play(); } catch { this.hum = null; }
    }
    this.hum?.setRate?.(.8 + .7 * stage.progress);
    if (stage.id !== this.lastStage) {
      this.lastStage = stage.id;
      this.scene.sound?.play?.('sfx-stone-collected', { volume: .12, rate: 1 + stage.progress * .5 });
    }
  }
  drawEffects() {
    if (!this.graphics?.scene || !this.label?.scene) return;
    const s = this.scene, stage = hammerAttackForHold(this.elapsed), pose = s.meleeAnimation?.lastPose;
    this.graphics.clear();
    if (!this.holding || !this.ready || !stage.charged || this.blocked() || !pose || pose.phase.stage !== 'charge') {
      this.graphics.setVisible(false); this.label.setVisible(false); return;
    }
    const cos = Math.cos(pose.angle), sin = Math.sin(pose.angle);
    const x = pose.x + pose.direction * (pose.hand.x + pose.length * (.77 * cos + .02 * sin));
    const y = pose.feetY + pose.hand.y + pose.length * (.77 * sin - .02 * cos);
    this.head = { x, y }; this.graphics.setVisible(true).setDepth(s.player.depth + .2);
    const time = this.elapsed / 70, rays = stage.superCharge ? 7 : stage.id === 'power' ? 5 : 3;
    for (let i = 0; i < rays; i++) {
      const a = i * Math.PI * 2 / rays + Math.sin(time * .7) * .22, r = 12 + 4 * stage.progress;
      const points = [0, 1, 2, 3].map(j => {
        const d = r + j * 4, bend = j % 2 ? 3 * Math.sin(time + i) : -2;
        return { x: x + Math.cos(a) * d - Math.sin(a) * bend, y: y + Math.sin(a) * d + Math.cos(a) * bend };
      });
      this.graphics.lineStyle(4, stage.color, .15).strokePoints(points, false);
      this.graphics.lineStyle(1.7, stage.color, .95).strokePoints(points, false);
    }
    this.label.setText(stage.label).setColor('#' + stage.color.toString(16).padStart(6, '0'))
      .setPosition(s.player.x, pose.feetY - s.player.displayHeight - 10).setDepth(s.player.depth + .3).setVisible(true);
  }
  get moveFactor() { return this.holding ? HAMMER_CHARGE.moveFactor : 1; }
  stopEffects() {
    this.hum?.stop(); this.hum?.destroy(); this.hum = null;
    if (this.graphics?.scene) this.graphics.clear().setVisible(false);
    if (this.label?.scene) this.label.setVisible(false);
  }
  cancel() { ++this.sequence; this.holding = false; this.ready = false; this.pendingRelease = false; this.elapsed = 0; this.stopEffects(); }
  destroy() {
    this.cancel(); this.pendingWave = null; this.scene.input?.keyboard?.off?.('keyup-SPACE', this.releaseKey);
    this.graphics.destroy(); this.label.destroy();
  }
}
