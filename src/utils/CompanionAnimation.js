import { HELPER_MOTION_EMPTY } from './levelMotionAssets.js';
import { animationPaused } from './PlayerAnimation.js';
import { playMotionSound } from './MotionAudio.js';

export default class CompanionAnimation {
  constructor(scene) {
    this.scene = scene; this.frames = scene.registry.get('level-motion-assets')?.helper;
    if (this.frames) this.image = scene.add.image(0, 0, this.frames[0].key).setOrigin(.5, 1).setVisible(false);
    this.clock = 0; this.idleFor = 0; this.direction = 1; this.nextSlurp = 0;
  }
  update(delta = 16) {
    const s = this.scene, h = s.helper || s.companion;
    if (!this.frames || !h?.active || !h.visible || h.body?.enable === false) { this.image?.setVisible(false); return; }
    const dt = animationPaused(s) ? 0 : Math.min(50, Math.max(0, delta)); this.clock += dt;
    const distance = this.previous ? Math.hypot(h.x - this.previous.x, h.y - this.previous.y) : 0;
    const dx = this.previous ? h.x - this.previous.x : 0;
    this.previous = { x: h.x, y: h.y };
    if (distance > .15) this.lastMovementAt = this.clock;
    const moving = this.clock - (this.lastMovementAt ?? -Infinity) < 45;
    if (Math.abs(dx) > .1) this.direction = Math.sign(dx);
    if (s.helperDrinkingPuddle) {
      this.image.setVisible(false);
      if (dt && this.clock >= this.nextSlurp) { playMotionSound(s, 'sfx-helper-slurp', .13); this.nextSlurp = this.clock + 1150; }
      return;
    }
    const seq = s.companionActions?.sequence, action = s.companionActions?.phase, state = h.getData?.('state');
    let index = 0, bob = 0, angle = 0;
    if (seq) {
      this.direction = seq.direction;
      index = ({ concern: 18, anger: 19, windup: 20, dash: 21, impact: 22, return: 23 })[action] ?? 18;
      if (action === 'dash' || action === 'return') bob = Math.sin(Math.min(1, (seq.elapsed % 400) / 400) * Math.PI) * 8;
      if (action === 'anger') angle = Math.sin(this.clock / 28) * .05;
    } else if (state === 'returning-fruit') {
      if (this.lastState === 'fetching') this.pickupUntil = this.clock + 170;
      index = this.clock < this.pickupUntil ? 14 : Math.floor(this.clock / 200) % 2 ? 15 : 16;
    }
    else if (state === 'fetching') index = moving ? 6 + Math.floor(this.clock / 95) % 6 : 12;
    else if (moving) { index = 6 + Math.floor(this.clock / 95) % 6; bob = Math.abs(Math.sin(this.clock / 100)) * 2; this.idleFor = 0; }
    else {
      this.idleFor += dt;
      const cycle = this.idleFor % 16000;
      index = cycle > 14800 ? 5 : cycle > 12800 && cycle < 13600 ? 3 : cycle > 8500 && cycle < 9200 ? 4 : cycle > 5200 && cycle < 5900 ? 2
        : Math.floor(this.clock / 300) % 14 === 13 ? 1 : 0;
      bob = Math.sin(this.clock / 480) * .65;
    }
    if (!seq && !['fetching', 'returning-fruit'].includes(state) && s.companionActions?.clock < s.companionActions?.concernUntil) index = 18;
    if (state === 'fetching' && this.lastState !== 'fetching') { playMotionSound(s, 'sfx-helper-curious', .18); this.discoveryUntil = this.clock + 330; }
    if (this.clock < this.discoveryUntil) index = 13;
    if (this.lastState === 'returning-fruit' && state !== this.lastState && !seq) this.deliveredUntil = this.clock + 550;
    if (this.clock < this.deliveredUntil) index = 17;
    this.lastState = state;
    const feetY = h.y + (1 - (h.originY ?? .5)) * h.displayHeight;
    const size = h.displayHeight / 137;
    h.setTexture(HELPER_MOTION_EMPTY);
    this.image.setTexture(this.frames[index].key).setPosition(h.x, feetY - bob).setScale(size).setFlipX(this.direction < 0)
      .setRotation(angle).setVisible(h.visible).setAlpha(h.alpha).setDepth(h.depth + .05);
    // The carry frames already contain the berry; keep the existing delivery
    // logic and its visibility flag, but avoid drawing a second red circle.
    s.companionFruit?.setAlpha(state === 'returning-fruit' ? 0 : 1);
    this.currentFrame = index;
  }
  destroy() {
    const h = this.scene.helper || this.scene.companion;
    if (h?.active && h.texture?.key === HELPER_MOTION_EMPTY) h.setTexture('companion-running');
    this.scene.companionFruit?.setAlpha(1); this.image?.destroy();
  }
}
