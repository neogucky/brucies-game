import { PLAYER_MOTION_EMPTY } from './levelMotionAssets.js';
import KnightGait from './KnightGait.js';

export const MOTION_TIMING = { crouch: 120, landing: 170, idleSpecialAfter: 6500 };
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));

export function swordHand(frame, direction) {
  // The existing left-facing view has a small far-side right gauntlet.
  // Looking right presents the other painted shoulder to the fixed camera.
  return direction > 0 ? frame.otherHand || frame.hand : frame.hand;
}

export function animationPaused(scene) {
  return Boolean(scene.isPaused || scene.inventoryOpen || scene.confirmation?.isOpen || scene.isEditorMode
    || scene.isGameOver || scene.isComplete || scene.levelCompleted
    || scene.isHitboxEditMode || scene.time?.paused || scene.physics?.world?.isPaused
    || scene.isInteractingWithLever || scene.dialog?.container?.visible || scene.startScreen?.active);
}

export function motionFrame(state, elapsed, female = false) {
  const base = female ? 16 : 0;
  if (state === 'walk' || state === 'run') return { atlas: 'locomotion', index: base + (state === 'run' ? 8 : 0) + Math.floor(elapsed / (state === 'run' ? 52 : 82)) % 8 };
  const pose = state === 'crouch' ? (elapsed < 65 ? 5 : 6) : state === 'stand' ? (elapsed < 60 ? 5 : 0)
    : state === 'rise' ? (elapsed < 45 ? 7 : 8) : state === 'apex' ? 9 : state === 'fall' ? 10
    : state === 'land' ? (elapsed < 75 ? 11 : 12) : state === 'helmet' ? (elapsed < 150 || elapsed > 780 ? 2 : 3)
    : state === 'look' ? (elapsed < 400 ? 2 : 14) : state === 'stretch' ? (elapsed < 350 ? 4 : 15)
    : elapsed % 4600 > 4370 ? 1 : 0;
  return { atlas: 'poses', index: base + pose };
}

export default class PlayerAnimation {
  constructor(scene) {
    this.scene = scene; this.assets = scene.registry.get('level-motion-assets');
    if (!this.assets) return;
    this.body = scene.add.image(0, 0, this.assets.poses[0].key).setOrigin(.5, 1);
    this.weapon = scene.add.image(0, 0, 'item-sword');
    this.gait = new KnightGait(scene);
    this.clock = 0; this.elapsed = 0; this.idleFor = 0; this.specialIndex = 0;
    this.nextSpecial = MOTION_TIMING.idleSpecialAfter; this.state = 'idle'; this.direction = -1;
    this.hurt = () => { this.hurtUntil = this.clock + 240; };
    scene.events.on('player-hurt', this.hurt);
    this.hide();
  }
  hide() { this.body?.setVisible(false); this.weapon?.setVisible(false); this.gait?.hide(); }
  restore() {
    this.hide(); const p = this.scene.player;
    if (p?.active && p.texture?.key === PLAYER_MOTION_EMPTY) {
      const key = p.getData?.(this.scene.isDucking ? 'crouchTexture' : 'standingTexture');
      if (key) p.setTexture(key);
    }
  }
  update(delta = 16) {
    const s = this.scene, p = s.player;
    if (!this.assets || !p?.active) { this.hide(); return; }
    const paused = animationPaused(s), dt = paused ? 0 : Math.min(50, Math.max(0, delta));
    this.clock += dt;
    const velocity = p.body?.velocity || { x: 0, y: 0 }, jump = s.gameMode === 'jump' || s.sys.settings.key === 'CoinChallengeScene';
    const grounded = !jump || Boolean(p.body?.blocked?.down || p.body?.touching?.down);
    const distance = this.previous ? Math.hypot(p.x - this.previous.x, jump ? 0 : p.y - this.previous.y) : 0;
    this.previous = { x: p.x, y: p.y };
    if (distance > .05 && distance < 30) this.lastMovementAt = this.clock;
    // Arcade advances at 60 Hz even on a 120/144 Hz screen. An unchanged render
    // frame is not a stop; keep the gait between physics steps, but stop shortly
    // after walking into a wall or immediately when movement input ends.
    const moving = this.clock - (this.lastMovementAt ?? -Infinity) < 45
      && (Math.abs(velocity.x) > 2 || (!jump && Math.abs(velocity.y) > 2));
    if (Math.abs(velocity.x) > 2) this.direction = Math.sign(velocity.x);
    else this.direction = s.facingX || (s.facing?.x ? Math.sign(s.facing.x) : this.direction);
    const landing = grounded && this.wasGrounded === false && (this.previousVy ?? 0) > 80;
    this.wasGrounded = grounded; this.previousVy = velocity.y;
    let state;
    if (jump && !grounded) state = velocity.y < -80 ? 'rise' : velocity.y > 80 ? 'fall' : 'apex';
    else if (s.isDucking) state = 'crouch';
    else if (landing || (this.state === 'land' && this.elapsed < MOTION_TIMING.landing && !moving)) state = 'land';
    else if (this.state === 'crouch' || (this.state === 'stand' && this.elapsed < MOTION_TIMING.crouch)) state = 'stand';
    else if (moving) state = s.dashActive || (s.sys.settings.key === 'JungleScene' && s.equipped?.shoes) ? 'run' : 'walk';
    else state = 'idle';
    const ownsPose = Boolean(s.meleeAnimation?.state || s.isSwinging || s.hammerCharge?.holding || s.hammerSlamActive
      || s.climbingVine || s.climbMantle || s.climbing || s.weaponSwitch?.now < s.weaponSwitch?.shotUntil
      || s.isGameOver || s.levelCompleted || s.isComplete || s.isInteractingWithLever);
    if (state === 'idle' && !ownsPose && !paused) {
      this.idleFor += dt;
      if (this.idleFor > this.nextSpecial) {
        if (!this.special) { this.special = ['helmet', 'look', 'stretch'][this.specialIndex++ % 3]; this.specialAt = this.clock; }
        state = this.special;
        if (this.clock - this.specialAt > 1000) { this.special = null; this.nextSpecial = this.idleFor + 9000 + (this.specialIndex % 3) * 2700; state = 'idle'; }
      }
    } else if (state !== 'idle') { this.idleFor = 0; this.special = null; this.nextSpecial = MOTION_TIMING.idleSpecialAfter; }
    if (state !== this.state) { this.state = state; this.elapsed = 0; } else this.elapsed += dt;
    s.motionAudio?.update({ state, elapsed: this.elapsed, dt, moving, grounded, landing, velocity, jump });
    if (ownsPose) { this.restore(); return; }
    const female = s.registry.get('saveData')?.playerGender === 'female' || s.gender === '-female';
    const descriptor = motionFrame(state, this.elapsed, female);
    let frame = this.assets[descriptor.atlas][descriptor.index];
    this.currentFrame = descriptor;
    const scale = Math.abs(p.scaleY), feetY = p.y + (1 - (p.originY ?? 1)) * p.displayHeight;
    const walk = state === 'walk' || state === 'run';
    let phase = this.elapsed / (state === 'run' ? 416 : 656) * Math.PI * 2;
    if (walk && this.assets.rig) {
      frame = this.assets.rig.torsos[(female ? 2 : 0) + (state === 'run' ? 1 : 0)];
      this.gait.update({ delta: dt, running: state === 'run', direction: this.direction, scale, x: p.x, feetY,
        depth: p.depth + .001, alpha: p.alpha, visible: p.visible });
      phase = this.gait.phase;
    } else this.gait.hide();
    const bob = walk ? (state === 'run' ? Math.abs(Math.sin(phase)) * 1.5 : Math.cos(phase * 2) * .6) * scale : 0;
    const breath = state === 'idle' ? Math.sin(this.clock / 550) * .0035 : 0;
    const lean = walk ? this.direction * (state === 'run' ? .035 : .012) : this.clock < this.hurtUntil ? -.06 * this.direction : 0;
    p.setTexture(PLAYER_MOTION_EMPTY);
    this.body.setTexture(frame.key).setPosition(p.x, feetY - bob).setScale(scale * (1 + breath), scale * (1 - breath)).setRotation(lean)
      .setFlipX(this.direction > 0).setDepth(p.depth + .01).setAlpha(p.alpha).setVisible(p.visible);
    this.drawWeapon(frame, scale, feetY - bob);
  }
  drawWeapon(frame, scale, feetY) {
    const s = this.scene, p = s.player, weapon = s.equipped?.weapon;
    if (!weapon || ['helmet', 'stretch'].includes(this.state)) { this.weapon.setVisible(false); return; }
    const bow = s.weaponSwitch?.hand === 'bow' || s.weaponSwitch?.pending?.kind === 'bow';
    const part = s.registry.get('melee-animation-assets')?.parts[weapon];
    const switching = s.weaponSwitch?.pending;
    const fold = switching ? Math.sin(clamp(1 - (switching.readyAt - s.weaponSwitch.now) / 200) * Math.PI) : 0;
    const grip = weapon === 'sword' && !bow ? swordHand(frame, this.direction) : frame.hand;
    const hand = { x: grip.x * scale, y: grip.y * scale + fold * 9 };
    if (bow) {
      this.weapon.setTexture('item-bow').setOrigin(.5).setDisplaySize(28 * scale / .6, 34 * scale / .6)
        .setPosition(p.x + this.direction * (hand.x + 7), feetY + hand.y - 9).setFlipX(this.direction < 0).setRotation(0);
    } else if (part) {
      const length = (weapon === 'sword' ? 38 : 33) * scale / .6, partScale = length / part.length;
      const angle = (weapon === 'sword' && this.direction > 0 ? -2 : -1.15) + fold * .8 + (this.state === 'run' ? Math.sin(this.elapsed / 66) * .09 : 0);
      this.weapon.setTexture(part.key).setOrigin(part.originX, part.originY).setPosition(p.x + this.direction * hand.x, feetY + hand.y)
        .setScale(-this.direction * partScale, partScale).setRotation(this.direction * (angle - part.angle));
    }
    this.weapon.setDepth(p.depth + (weapon === 'sword' && !bow && this.direction < 0 ? .005 : .02)).setAlpha(p.alpha).setVisible(p.visible);
  }
  destroy() { this.restore(); this.body?.destroy(); this.weapon?.destroy(); this.gait?.destroy(); this.scene.events.off('player-hurt', this.hurt); }
}
