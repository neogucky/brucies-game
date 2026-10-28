import { resetSceneKeys } from './PortableControls.js';
import LeverVisual, { LEVER_PIVOT_HEIGHT } from './LeverVisual.js';

export const LEVER_TIMING = { reach: 600, pull: 1600, reveal: 1860, finish: 2600 };
export const LEVER_CLOSEUP = { x: 575, y: 432, scale: 1.85, actorX: 525, feetY: 434.5, actorScale: 1.25 };
// Match the broad armor and gauntlet of the painted body. Combat's narrow
// sleeves look like a miniature arm when reused in this close camera view.
export const LEVER_ARM = { upperLength: 14, forearmLength: 15, upperWidth: 13, forearmWidth: 10.5, handLength: 5.5 };
const clamp = n => Math.max(0, Math.min(1, n));
const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
const mix = (a, b, t) => a + (b - a) * t;

export function leverHandle(x, y, progress = 0, scale = 1) {
  const angle = mix(.62, -.62, ease(progress));
  return { x: x + Math.sin(angle) * 32 * scale, y: y - (LEVER_PIVOT_HEIGHT + Math.cos(angle) * 32) * scale };
}

// Two rigid arm segments bend at the elbow. They never shorten to fit a grip
// close to the body. The final link includes the palm's fixed wrist offset.
export function leverArmPose(shoulder, hand, upperLength, forearmLength, wristOffset) {
  const dx = hand.x - shoulder.x, dy = hand.y - shoulder.y, distance = Math.max(.001, Math.hypot(dx, dy));
  const nx = dx / distance, ny = dy / distance, secondLength = forearmLength + wristOffset;
  const along = (upperLength ** 2 - secondLength ** 2 + distance ** 2) / (2 * distance);
  const bend = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  const elbow = { x: shoulder.x + nx * along - ny * bend, y: shoulder.y + ny * along + nx * bend };
  const handAngle = Math.atan2(hand.y - elbow.y, hand.x - elbow.x);
  const wrist = { x: hand.x - Math.cos(handAngle) * wristOffset, y: hand.y - Math.sin(handAngle) * wristOffset };
  return { shoulder, elbow, wrist, hand, handAngle };
}

// Phaser pauses timer events, but Clock.now still follows the game's clock.
// Keep combat deadlines and the desert's elapsed-time counter frozen as well.
export function resumeLeverClocks(scene, elapsed) {
  // Phaser has already destroyed groups when a scene shuts down mid-cutaway.
  // Those deadlines no longer need adjusting for a stopped scene.
  if (scene.sys?.isActive?.() === false) return;
  const shift = object => {
    if (!object) return;
    for (const key of Object.keys(object)) {
      if (/(?:At|Until)$/.test(key) && Number.isFinite(object[key]) && object[key] > 0) object[key] += elapsed;
    }
  };
  shift(scene.shield); shift(scene.companionShield);
  if (typeof scene.worldTime === 'number') return;
  shift(scene);
  const actors = [scene.player, scene.companion];
  for (const group of [scene.monsters, scene.molesGroup, scene.stoneMonstersGroup, scene.batsGroup]) actors.push(...(group?.getChildren() || []));
  actors.forEach(actor => shift(actor?.data?.values || actor?.data));
  for (const ai of scene.moleAIs?.values?.() || []) { shift(ai); shift(ai.action); }
}

// A close camera view reuses the knight's weapon-free bodies and gauntlets.
// Its hand stays attached to the moving handle throughout the pull.
class LeverActor {
  constructor(scene, container) {
    this.assets = scene.registry.get('melee-animation-assets');
    this.female = scene.registry.get('saveData')?.playerGender === 'female';
    this.images = [];
    const add = key => {
      const image = scene.add.image(0, 0, key).setScrollFactor(0); container.add(image); this.images.push(image); return image;
    };
    if (!this.assets) {
      this.body = add(scene.player.getData?.('standingTexture') || scene.player.texture.key).setOrigin(.5, 1);
      return;
    }
    this.frames = this.assets.bodies[(this.female ? 'female' : 'male') + '-stand'];
    this.parts = this.assets.parts;
    this.body = add(this.frames[0].key).setOrigin(.5, 1);
    this.upper = add(this.parts.upper.key); this.forearm = add(this.parts.forearm.key); this.hand = add(this.parts.hand.key);
  }
  draw(progress, reaching) {
    const { actorScale: scale, feetY, actorX: x } = LEVER_CLOSEUP;
    if (!this.assets) { this.body.setPosition(x, feetY).setScale(scale); return; }
    const frame = this.frames[Math.round(progress)], tilt = mix(.22, -.14, progress);
    const sx = frame.shoulder.x * scale - 4 * scale / .6, sy = frame.shoulder.y * scale;
    const shoulder = { x: x + sx * Math.cos(tilt) - sy * Math.sin(tilt), y: feetY + sx * Math.sin(tilt) + sy * Math.cos(tilt) };
    const grip = leverHandle(LEVER_CLOSEUP.x, LEVER_CLOSEUP.y, progress, LEVER_CLOSEUP.scale);
    const hand = { x: mix(shoulder.x + 12, grip.x, reaching), y: mix(shoulder.y + 51, grip.y, reaching) };
    const handLength = LEVER_ARM.handLength * scale / .6, wristOffset = handLength * (this.parts.hand.wristRatio ?? .85);
    const pose = leverArmPose(shoulder, hand, LEVER_ARM.upperLength * scale / .6, LEVER_ARM.forearmLength * scale / .6, wristOffset);
    const { elbow, wrist } = pose;
    this.body.setTexture(frame.key).setPosition(x, feetY).setScale(scale).setFlipX(true).setRotation(tilt);
    this.limb(this.upper, this.parts.upper, shoulder, elbow, LEVER_ARM.upperWidth * scale / .6);
    this.limb(this.forearm, this.parts.forearm, elbow, wrist, LEVER_ARM.forearmWidth * scale / .6);
    this.upper.setVisible(true); this.forearm.setVisible(true);
    this.part(this.hand, this.parts.hand, hand, pose.handAngle, handLength);
    this.pose = pose;
    this.grip = { ...hand }; // Also used to verify that the hand follows the handle.
  }
  limb(image, part, start, end, thickness) {
    this.part(image, part, start, Math.atan2(end.y - start.y, end.x - start.x), Math.hypot(end.x - start.x, end.y - start.y));
    image.scaleY = thickness / part.height;
  }
  part(image, part, pivot, angle, length) {
    const scale = length / part.length;
    image.setTexture(part.key).setOrigin(part.originX, part.originY).setPosition(pivot.x, pivot.y)
      .setScale(-scale, scale).setRotation(angle - part.angle);
  }
}

export default class LeverInteraction {
  constructor(scene, { world, color, background, onProgress, onFinish }) {
    this.scene = scene; this.elapsed = 0; this.active = true; this.onProgress = onProgress; this.onFinish = onFinish;
    this.clockStartedAt = scene.time.now;
    this.previous = { paused: scene.isPaused, clock: scene.time.paused, physics: scene.physics.world.isPaused,
      locked: scene.attackInputLocked, tweensPaused: scene.tweens.paused === true };
    scene.isInteractingWithLever = true; scene.isPaused = true; scene.attackInputLocked = true;
    scene.game?.portableControls?.clearHeld(); resetSceneKeys(scene);
    scene.hammerCharge?.cancel(); if (scene.hammerCharge) scene.hammerCharge.pendingWave = null;
    if (scene.weaponSwitch) scene.weaponSwitch.pending = null;
    scene.isSwinging = false; scene.hammerSlamActive = false;
    for (const name of ['swingTimer', 'weaponWindupTimer', 'swordSwingSoundEvent']) {
      scene[name]?.remove?.(false); scene[name] = null;
    }
    scene.swordHitbox?.setVisible(false); scene.swordHitbox?.body?.setEnable(false);
    scene.meleeAnimation?.restore();
    const standing = scene.player.getData?.(scene.isDucking ? 'crouchTexture' : 'standingTexture');
    if (standing) scene.player.setTexture(standing);
    // Phaser 3.80 pauseAll pauses the manager, leaving each tween's own pause
    // state alone. Restore that same manager instead of resuming individual tweens.
    scene.time.paused = true; scene.physics.world.pause(); scene.tweens.pauseAll();
    this.pausedSounds = (scene.sound.sounds || []).filter(sound => sound.isPlaying && sound.loop && sound.key.startsWith('sfx-'));
    this.pausedSounds.forEach(sound => sound.pause());
    this.hiddenActors = [scene.player, scene.weaponSwitch?.backShield, scene.shield?.bubble].filter(Boolean)
      .map(actor => ({ actor, visible: actor.visible }));
    this.hiddenActors.forEach(({ actor }) => actor.setVisible(false));
    this.container = scene.add.container(0, 0).setDepth(1000).setScrollFactor(0);
    const add = object => { object.setScrollFactor(0); this.container.add(object); return object; };
    add(scene.add.rectangle(480, 300, 960, 600, 0x08130e, .6).setInteractive());
    add(scene.add.rectangle(480, 300, 726, 356, 0x223a31).setStrokeStyle(3, color));
    add(scene.add.image(480, 300, background).setDisplaySize(720, 350));
    add(scene.add.rectangle(480, 300, 720, 350, world === 'desert' ? 0xe0be84 : world === 'jungle' ? 0x284b36 : 0x1a2e3a, .12));
    add(scene.add.ellipse(510, 435, 145, 15, 0x17251e, .18));
    this.lever = new LeverVisual(scene, world, LEVER_CLOSEUP.x, LEVER_CLOSEUP.y, LEVER_CLOSEUP.scale, this.container);
    this.actor = new LeverActor(scene, this.container);
    this.actor.draw(0, 0); this.lever.draw(leverHandle(LEVER_CLOSEUP.x, LEVER_CLOSEUP.y, 0, LEVER_CLOSEUP.scale)); this.container.setAlpha(0);
    this.cancelOnShutdown = () => this.cancel(); scene.events.once('shutdown', this.cancelOnShutdown);
  }
  update(delta = 0) {
    if (!this.active) return;
    this.elapsed += Math.max(0, Math.min(50, delta));
    const t = this.elapsed, progress = ease((t - LEVER_TIMING.reach) / (LEVER_TIMING.pull - LEVER_TIMING.reach));
    this.progress = progress;
    this.actor.draw(progress, ease((t - 180) / 420));
    this.lever.draw(leverHandle(LEVER_CLOSEUP.x, LEVER_CLOSEUP.y, progress, LEVER_CLOSEUP.scale)); this.onProgress(progress);
    const alpha = t < 180 ? ease(t / 180) : t < LEVER_TIMING.pull ? 1 : 1 - ease((t - LEVER_TIMING.pull) / 260);
    this.container.setAlpha(alpha);
    if (t >= LEVER_TIMING.pull && !this.rumbling) {
      this.rumbling = true; this.scene.sound.play('sfx-key-open', { volume: .5 });
      this.scrape = this.scene.sound.add('sfx-stone-scrape', { volume: .65 }); this.scrape.play();
      this.scene.cameras?.main?.shake?.(950, .006);
    }
    if (t >= LEVER_TIMING.reveal) this.restoreActors();
    if (t >= LEVER_TIMING.finish) {
      this.active = false; this.restore(true); this.onFinish();
    }
  }
  restoreActors() {
    this.hiddenActors.forEach(({ actor, visible }) => { if (actor.active !== false) actor.setVisible(visible); });
    this.hiddenActors = [];
  }
  restore(completed) {
    const s = this.scene;
    this.restoreActors(); this.container.destroy(true); this.scrape?.stop(); this.scrape?.destroy();
    s.events.off('shutdown', this.cancelOnShutdown);
    s.isInteractingWithLever = false; s.isPaused = this.previous.paused; s.attackInputLocked = this.previous.locked;
    if (s.time) s.time.paused = this.previous.clock;
    if (s.sys?.isActive?.() === false) {
      // Clock and TweenManager instances can be reused on the next scene start.
      s.tweens?.resumeAll?.(); return;
    }
    resumeLeverClocks(s, Math.max(0, s.time.now - this.clockStartedAt));
    if (this.previous.tweensPaused) s.tweens.pauseAll(); else s.tweens.resumeAll();
    if (!this.previous.physics) s.physics.world.resume();
    this.pausedSounds.forEach(sound => { if (sound.isPaused) sound.resume(); });
    resetSceneKeys(s); s.game?.portableControls?.clearHeld();
    if (completed) {
      const until = s.time.now + 1200;
      s.player.setData?.('invulnerableUntil', Math.max(s.player.getData?.('invulnerableUntil') || 0, until));
      if (typeof s.worldTime === 'number') s.invulnerableUntil = Math.max(s.invulnerableUntil || 0, s.worldTime + 1200);
    }
  }
  cancel() { if (this.active) { this.active = false; this.restore(false); } }
}
