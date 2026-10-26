import { getWeaponStats, getAttackStats } from './weapons.js';
import { HAMMER_CHARGE } from './hammerRules.js';

export const MELEE_EMPTY_TEXTURE = 'melee-player-body';
export const MELEE_RECOVERY_MS = 90;
const BODY_STEPS = 6;
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const mix = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const between = (a, b, t) => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) });

// Cutouts are registered by their boots and shoulder, never by the cape bounds.
const BODY_CUTS = [
  [[72, 35, 300, 374, 174, 402, 132, 238], [396, 47, 326, 362, 521, 402, 459, 249], [759, 68, 313, 341, 885, 402, 818, 272]],
  [[85, 455, 287, 281, 174, 729, 137, 603], [390, 442, 337, 292, 523, 729, 455, 596], [762, 463, 306, 272, 886, 729, 812, 619]],
  [[71, 752, 306, 371, 174, 1117, 130, 956], [396, 760, 334, 369, 521, 1122, 464, 963], [759, 780, 309, 349, 885, 1122, 822, 985]],
  [[78, 1140, 300, 285, 175, 1419, 137, 1290], [396, 1135, 329, 290, 522, 1419, 457, 1293], [760, 1155, 307, 271, 885, 1420, 819, 1311]],
];
const PART_CUTS = {
  upper: { rect: [72, 230, 544, 305], pivot: [512, 421], end: [157, 421] },
  forearm: { rect: [690, 315, 504, 220], pivot: [1130, 428], end: [742, 428] },
  hand: { rect: [134, 819, 365, 277], pivot: [290, 951], end: [140, 951], wristRatio: 155 / 150 },
  sword: { rect: [620, 852, 612, 215], pivot: [1155, 961], end: [625, 961] },
  powerHammer: { atlas: 'melee-parts-atlas', rect: [30, 755, 580, 345], pivot: [511, 939], end: [37, 939] },
};

function silhouetteHull(pixels, width, height, pivot, length) {
  const points = [];
  for (let y = 0; y < height; y++) {
    let left = width, right = -1;
    for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4 + 3] >= 100) {
      left = Math.min(left, x); right = x;
    }
    if (right >= left) for (const x of [left, right]) points.push({ x: (pivot.x - x) / length, y: (y - pivot.y) / length });
  }
  points.sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = values => {
    const result = [];
    for (const p of values) {
      while (result.length >= 2 && cross(result.at(-2), result.at(-1), p) <= 0) result.pop();
      result.push(p);
    }
    return result.slice(0, -1);
  };
  return [...half(points), ...half(points.slice().reverse())];
}

export function registerMeleeBodyRow(scene, atlas, cuts, id, pixelScale = .368) {
  const bases = cuts.map(([x, y, width, height, footX, footY, shoulderX, shoulderY]) => {
      const canvas = document.createElement('canvas'); canvas.width = 200; canvas.height = 150;
      canvas.getContext('2d').drawImage(atlas, x, y, width, height,
        100 + (x - footX) * pixelScale, 148 + (y - footY) * pixelScale, width * pixelScale, height * pixelScale);
      return { canvas, shoulder: { x: (footX - shoulderX) * pixelScale, y: 148 - 150 + (shoulderY - footY) * pixelScale } };
    });
  return Array.from({ length: BODY_STEPS * 2 + 1 }, (_, index) => {
      const phase = index / BODY_STEPS, nearest = Math.round(phase), base = bases[nearest];
      const shear = -(phase - nearest) * .045, squash = 1 - Math.sin(phase * Math.PI / 2) * .018;
      const key = 'melee-' + id + '-' + index;
      const texture = scene.textures.createCanvas(key, 200, 150), ctx = texture.getContext();
      // Solid cutout in-betweens keep the face crisp; a dissolve produces double
      // eyes and transparent armor. The boots stay on the same ground anchor.
      ctx.translate(100, 148); ctx.transform(1, 0, shear, squash, 0, 0);
      ctx.drawImage(base.canvas, -100, -148); texture.refresh();
      return { key, shoulder: { x: base.shoulder.x - shear * (base.shoulder.y + 2), y: (base.shoulder.y + 2) * squash - 2 } };
    });
}

export function registerMeleeTextures(scene) {
  if (scene.textures.exists(MELEE_EMPTY_TEXTURE)) return;
  scene.textures.createCanvas(MELEE_EMPTY_TEXTURE, 150, 150).refresh();
  const atlas = scene.textures.get('melee-bodies-atlas').getSourceImage();
  const bodies = {};
  BODY_CUTS.forEach((cuts, row) => {
    const gender = row >= 2 ? 'female' : 'male', ducking = row % 2 === 1;
    const id = gender + (ducking ? '-crouch' : '-stand');
    bodies[id] = registerMeleeBodyRow(scene, atlas, cuts, id);
  });
  const parts = {};
  for (const [id, cut] of Object.entries(PART_CUTS)) {
    const source = scene.textures.get(cut.atlas || 'melee-parts-v2-atlas').getSourceImage();
    const [x, y, width, height] = cut.rect, key = 'melee-part-' + id;
    const texture = scene.textures.createCanvas(key, width, height), ctx = texture.getContext();
    ctx.drawImage(source, x, y, width, height, 0, 0, width, height); texture.refresh();
    const pivot = { x: cut.pivot[0] - x, y: cut.pivot[1] - y };
    const dx = cut.pivot[0] - cut.end[0], dy = cut.end[1] - cut.pivot[1], length = Math.hypot(dx, dy);
    parts[id] = { key, originX: pivot.x / width, originY: pivot.y / height, length, height, angle: Math.atan2(dy, dx), wristRatio: cut.wristRatio };
    if (id === 'sword' || id === 'powerHammer') parts[id].outline = silhouetteHull(ctx.getImageData(0, 0, width, height).data, width, height, pivot, length);
  }
  scene.registry.set('melee-animation-assets', { bodies, parts });
}

export function getMeleePhase(elapsed, stats, kind = 'swing', recovery = null) {
  if (recovery !== null) return { stage: 'recovery', bodyPhase: 2 * (1 - ease(recovery)), blend: ease(recovery) };
  if (kind === 'ready') return { stage: 'ready', bodyPhase: 0, blend: 0 };
  if (kind === 'charge') { const blend = ease(elapsed / HAMMER_CHARGE.superMs); return { stage: 'charge', bodyPhase: .2 + 1.2 * blend, blend }; }
  if (kind === 'slam') return { stage: 'slam', bodyPhase: 1.6, blend: ease(elapsed / 70) };
  if (kind === 'landing') return { stage: 'landing', bodyPhase: 2 * (1 - ease(elapsed / stats.swingMs)), blend: ease(elapsed / stats.swingMs) };
  if (stats.windupMs && elapsed < stats.windupMs) {
    const blend = stats.chargeProgress !== undefined ? ease(elapsed / stats.windupMs)
      : ease((elapsed - stats.windupMs * .55) / (stats.windupMs * .45));
    const fromBody = stats.chargeProgress !== undefined ? .2 + 1.2 * ease(stats.chargeProgress) : 0;
    return { stage: 'windup', bodyPhase: mix(fromBody, .4, blend), blend };
  }
  const blend = ease((elapsed - stats.windupMs) / (stats.swingMs - stats.windupMs));
  return { stage: 'strike', bodyPhase: .4 + 1.6 * blend, blend };
}

export function weaponOutlineBounds(part, length, angle) {
  const points = part.outline.map(p => ({ x: length * (p.x * Math.cos(angle) - p.y * Math.sin(angle)), y: length * (p.x * Math.sin(angle) + p.y * Math.cos(angle)) }));
  return { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) };
}

// All geometry is in facing-local coordinates: positive x points at the enemy.
export function getMeleePose({ elapsed, stats, weapon, hit, x, feetY, scale = .6, direction = 1, ducking = false, kind = 'swing', recovery = null, recoveryPose, assets }) {
  const phase = getMeleePhase(elapsed, stats, kind, recovery);
  const bodyFrames = assets.bodies, frame = bodyFrames[Math.round(phase.bodyPhase * BODY_STEPS)];
  // The joint sits inside the shoulder plate, rather than on its outer edge.
  const shoulder = { x: frame.shoulder.x * scale - 4 * scale / .6, y: frame.shoulder.y * scale };
  const reach = direction > 0 ? hit.x + hit.width - x : x - hit.x;
  const length = 38 * scale / .6;
  const part = assets.parts[weapon];
  const centerY = hit.y + hit.height / 2 - feetY;
  const aim = clamp(Math.atan2(centerY - shoulder.y, Math.max(1, reach - shoulder.x)) * .6, -.45, .35);
  const angleLimit = weapon === 'powerHammer' ? .65 : .9;
  const firstAngle = clamp(-.5 + aim, -angleLimit, angleLimit);
  const activeAngle = clamp(mix(-.5, .5, phase.blend) + aim, -angleLimit, angleLimit);
  const activeBounds = weaponOutlineBounds(part, length, activeAngle);
  const freeHeight = Math.max(0, hit.height - (activeBounds.bottom - activeBounds.top));
  const strikeHand = { x: reach - activeBounds.right, y: centerY + (phase.blend - .5) * freeHeight * .65 - (activeBounds.top + activeBounds.bottom) / 2 };
  const readyHand = { x: shoulder.x + 8 * scale / .6, y: shoulder.y - 9 * scale / .6 };
  let angle = activeAngle, hand = strikeHand;
  if (phase.stage === 'ready') {
    hand = readyHand; angle = -1.2;
  } else if (phase.stage === 'charge') {
    hand = { x: shoulder.x + mix(9, 4, phase.blend) * scale / .6, y: shoulder.y - mix(8, 18, phase.blend) * scale / .6 };
    angle = mix(-1.25, -2.6, phase.blend);
  } else if (phase.stage === 'strike' && stats.chargeProgress !== undefined) {
    // Charged swings follow through all the way to the ground. Their forward
    // edge still agrees with melee reach; the last pose plants the hammer head.
    const drop = ease((elapsed - stats.windupMs) / (stats.impactMs - stats.windupMs));
    angle = mix(firstAngle, 1.2, drop);
    const bounds = weaponOutlineBounds(part, length, angle), first = weaponOutlineBounds(part, length, firstAngle);
    const firstY = centerY - Math.max(0, hit.height - first.bottom + first.top) * .325 - (first.top + first.bottom) / 2;
    hand = { x: reach - bounds.right, y: mix(firstY, -2 - bounds.bottom, drop) };
  } else if (phase.stage === 'windup') {
    const firstBounds = weaponOutlineBounds(part, length, firstAngle);
    const firstHand = { x: reach - firstBounds.right, y: centerY - Math.max(0, hit.height - firstBounds.bottom + firstBounds.top) * .325 - (firstBounds.top + firstBounds.bottom) / 2 };
    const charged = stats.chargeProgress !== undefined, chargeBlend = ease(stats.chargeProgress);
    const fromHand = charged ? { x: shoulder.x + mix(9, 4, chargeBlend) * scale / .6,
      y: shoulder.y - mix(8, 18, chargeBlend) * scale / .6 } : readyHand;
    hand = between(fromHand, firstHand, phase.blend);
    angle = mix(charged ? mix(-1.25, -2.6, chargeBlend) : -1.8, firstAngle, phase.blend);
  } else if (phase.stage === 'slam' || phase.stage === 'landing') {
    hand = { x: shoulder.x + 9 * scale / .6, y: shoulder.y - 5 * scale / .6 };
    angle = phase.stage === 'slam' ? mix(.8, 1.35, phase.blend) : mix(1.35, -1.2, phase.blend);
  } else if (phase.stage === 'recovery') {
    hand = between(recoveryPose.hand, readyHand, phase.blend); angle = mix(recoveryPose.angle, -1.2, phase.blend);
  }
  // A tucked hand foreshortens the sleeves. Fixed long bones would fold the
  // elbow past the fist here, making the arm look dislocated.
  const dx = hand.x - shoulder.x, dy = hand.y - shoulder.y, distance = Math.max(.001, Math.hypot(dx, dy));
  const handLength = 3.5 * scale / .6, wristOffset = handLength * (assets.parts.hand?.wristRatio ?? .85);
  const sleevesVisible = distance > wristOffset + 1.5 * scale / .6;
  const wrist = sleevesVisible
    ? { x: hand.x - dx / distance * wristOffset, y: hand.y - dy / distance * wristOffset } : { ...shoulder };
  const sleeveDistance = Math.hypot(wrist.x - shoulder.x, wrist.y - shoulder.y);
  const elbow = { x: mix(shoulder.x, wrist.x, .48), y: mix(shoulder.y, wrist.y, .48) + Math.min(2.5 * scale / .6, sleeveDistance * .12) };
  return { frame: frame.key, phase, shoulder, elbow, wrist, hand, handAngle: Math.atan2(dy, dx), handLength, sleevesVisible,
    angle, length, direction, x, feetY, scale, ducking,
    bounds: weaponOutlineBounds(part, length, angle) };
}

export default class MeleeAnimation {
  constructor(scene) {
    this.scene = scene; this.assets = scene.registry.get('melee-animation-assets');
    this.chargeOnly = scene.gameMode === 'isometric';
    if (!this.assets) return;
    this.parts = scene.meleeVisualType === 'trainer' ? this.assets.trainerParts : this.assets.parts;
    this.body = scene.add.image(0, 0, this.assets.bodies['male-stand'][0].key).setOrigin(.5, 1);
    this.upper = scene.add.image(0, 0, this.parts.upper.key);
    this.weapon = scene.add.image(0, 0, this.parts.sword.key);
    this.forearm = scene.add.image(0, 0, this.parts.forearm.key);
    this.hand = scene.add.image(0, 0, this.parts.hand.key);
    this.images = [this.body, this.upper, this.weapon, this.forearm, this.hand];
    this.hide();
  }

  clock() { return this.scene.worldTime ?? this.scene.time.now; }
  hide() { this.images?.forEach(image => image.setVisible(false)); }
  restore() {
    const s = this.scene, p = s.player;
    this.hide();
    if (p?.active && p.scene && p.texture?.key === MELEE_EMPTY_TEXTURE) p.setTexture(p.getData(s.isDucking ? 'crouchTexture' : 'standingTexture'));
  }
  update() {
    const s = this.scene, p = s.player;
    if (!this.assets || !p?.active) return;
    if (s.climbingVine || s.isGameOver || s.levelCompleted || s.isComplete || !getWeaponStats(s.equipped.weapon)
      || s.weaponSwitch?.pending?.kind === 'bow' || s.weaponSwitch?.hand === 'bow') {
      this.state = null; this.restore(); return;
    }
    const now = this.clock();
    const charging = s.hammerCharge?.holding && s.hammerCharge.ready;
    if (this.chargeOnly && !charging) { this.state = null; this.restore(); return; }
    const paused = s.isPaused || s.inventoryOpen || s.isEditorMode || s.isHitboxEditMode || s.time?.paused;
    const delta = paused || this.lastClock === undefined ? 0 : Math.max(0, now - this.lastClock);
    this.lastClock = now;
    if (charging) {
      this.state = { startedAt: s.hammerCharge.sequence, elapsed: s.hammerCharge.elapsed, weapon: 'powerHammer', kind: 'charge' };
    } else if (s.isSwinging) {
      const kind = s.hammerSlamActive ? 'slam' : s.swingVisualKind || 'swing';
      if (!this.state || this.state.startedAt !== s.swingStartedAt || this.state.kind !== kind || this.state.weapon !== s.equipped.weapon) {
        this.state = { startedAt: s.swingStartedAt ?? now, elapsed: Math.max(0, now - (s.swingStartedAt ?? now)), weapon: s.equipped.weapon, kind };
      } else {
        this.state.elapsed += delta;
      }
      if (kind !== 'slam' && Number.isFinite(s.swingTimer?.elapsed)) this.state.elapsed = s.swingTimer.elapsed;
    } else if (this.state && this.lastPose && this.state.kind !== 'ready') {
      if (this.state.recoveryElapsed === undefined) { this.state.recoveryElapsed = 0; this.state.recoveryPose = this.lastPose; }
      else this.state.recoveryElapsed += delta;
      if (this.state.recoveryElapsed >= MELEE_RECOVERY_MS) this.state = null;
    } else this.state = null;
    if (!this.state && s.meleeIdle) this.state = { kind: 'ready', weapon: s.equipped.weapon, elapsed: 0 };
    if (!this.state) { this.restore(); return; }
    const state = this.state, stats = getAttackStats(state.weapon, s.hammerAttack), scale = Math.abs(p.scaleY);
    const gender = s.meleeVisualType || (s.registry.get('saveData')?.playerGender === 'female' ? 'female' : 'male');
    const bodyFrames = this.assets.bodies[gender + (s.isDucking ? '-crouch' : '-stand')];
    const hit = s.getMeleeBounds ? s.getMeleeBounds() : s.swordHitbox.getBounds();
    const feetY = p.y + (1 - (p.originY ?? 1)) * (p.displayHeight || 0);
    const direction = s.facingX || (s.facing?.x < 0 ? -1 : 1);
    const pose = getMeleePose({ elapsed: state.elapsed, stats, weapon: state.weapon, hit, x: p.x, feetY,
      direction, scale, ducking: s.isDucking, kind: state.kind,
      recovery: state.recoveryElapsed === undefined ? null : state.recoveryElapsed / MELEE_RECOVERY_MS,
      recoveryPose: state.recoveryPose, assets: { bodies: bodyFrames, parts: this.parts } });
    this.lastPose = pose;
    p.setTexture(MELEE_EMPTY_TEXTURE);
    this.images.forEach((image, index) => image.setVisible(p.visible).setAlpha(p.alpha).setDepth(p.depth + .01 * (index + 1)));
    this.body.setTexture(pose.frame).setPosition(p.x, feetY).setScale(scale).setFlipX(direction > 0);
    this.drawLimb(this.upper, this.parts.upper, pose.shoulder, pose.elbow, pose);
    this.drawPart(this.weapon, this.parts[state.weapon], pose.hand, pose.angle, pose.length, pose);
    this.drawLimb(this.forearm, this.parts.forearm, pose.elbow, pose.wrist, pose);
    this.upper.setVisible(p.visible && pose.sleevesVisible); this.forearm.setVisible(p.visible && pose.sleevesVisible);
    this.drawPart(this.hand, this.parts.hand, pose.hand, pose.handAngle, pose.handLength, pose);
  }
  drawLimb(image, part, from, to, pose) {
    this.drawPart(image, part, from, Math.atan2(to.y - from.y, to.x - from.x), Math.hypot(to.x - from.x, to.y - from.y), pose);
    // Perspective changes sleeve length, while armor thickness stays constant.
    image.scaleY = (part === this.parts.upper ? 7 : 5.5) * pose.scale / .6 / part.height;
  }
  drawPart(image, part, pivot, angle, length, pose) {
    const scale = length / part.length;
    image.setTexture(part.key).setOrigin(part.originX, part.originY)
      .setPosition(pose.x + pose.direction * pivot.x, pose.feetY + pivot.y)
      .setScale(-pose.direction * scale, scale).setRotation(pose.direction * (angle - part.angle));
  }
  destroy() { this.restore(); this.images?.forEach(image => image.destroy()); this.state = null; }
}
