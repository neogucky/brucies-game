import { animationPaused } from './PlayerAnimation.js';
import { playMotionSound } from './MotionAudio.js';

export const HELPER_RETALIATION = { cooldown: 14000, opportunity: 3200, concern: 180, anger: 470, windup: 320, dash: 210, impact: 130, return: 400 };

export function retaliationPhase(elapsed) {
  let end = 0;
  for (const name of ['concern', 'anger', 'windup', 'dash', 'impact', 'return']) {
    const start = end; end += HELPER_RETALIATION[name];
    if (elapsed < end) return { name, progress: Math.max(0, (elapsed - start) / HELPER_RETALIATION[name]) };
  }
  return { name: 'done', progress: 1 };
}

export default class CompanionActions {
  constructor(scene) {
    this.scene = scene; this.clock = 0; this.nextAt = 0;
    this.onHurt = ({ amount }) => { if (amount > 0 && !scene.isGameOver) { this.helpUntil = this.clock + HELPER_RETALIATION.opportunity; this.concernUntil = this.clock + 480; } };
    scene.events.on('player-hurt', this.onHurt);
    this.method = scene.updateHelper ? 'updateHelper' : 'updateCompanion';
    this.original = scene[this.method];
    if (this.original) scene[this.method] = (...args) => { if (!this.sequence) return this.original.apply(scene, args); };
    scene.companion?.setData('target', null);
    this.icon = scene.add.text(0, 0, '!', { fontFamily: 'Arial', fontSize: '19px', fontStyle: 'bold', color: '#ed5d45', stroke: '#fff6bd', strokeThickness: 3 }).setOrigin(.5, 1).setVisible(false);
  }
  helper() { return this.scene.helper || this.scene.companion; }
  available() {
    const s = this.scene, h = this.helper();
    return h?.active && h.visible && h.body?.enable !== false && s.equipped?.companion
      && s.companionEnabled !== false && s.companionHealth !== 0 && !(s.companionRespawnAt > 0)
      && !(s.helperRespawnAt > (s.worldTime ?? 0)) && !s.isGameOver && !s.levelCompleted && !s.isComplete;
  }
  busyHelping() {
    const s = this.scene, h = this.helper(), state = h?.getData?.('state');
    return s.helperDrinkingPuddle || s.companionMode === 'fly' || ['fetching', 'returning-fruit', 'retreating', 'hidden'].includes(state);
  }
  target() {
    const s = this.scene, h = this.helper(), candidates = [];
    const add = (enemy, bounds, damage, eligible = true) => {
      if (!enemy?.active || !eligible || enemy.hidden || enemy.getData?.('emerging') || enemy.getData?.('dead')) return;
      const b = bounds(), x = b.x + b.width / 2, y = b.y + b.height / 2;
      const hy = h.y - (h.originY === 1 ? h.displayHeight * .45 : 0);
      const distance = Math.hypot(x - h.x, y - hy);
      if (distance > 125 || Math.abs(x - s.player.x) > 200 || Math.abs(y - hy) > 48
        || (s.hasLineOfSight && !s.hasLineOfSight(h.x, hy, x, y))) return;
      candidates.push({ enemy, x, y, distance, bounds, damage });
    };
    s.monsters?.getChildren().forEach(m => add(m, () => m.getBounds(), () => s.damageMonster(m, 1)));
    s.molesGroup?.getChildren().forEach(m => add(m, () => m.getBounds(), () => s.damageMole(m, 1)));
    s.stoneMonstersGroup?.getChildren().forEach(m => {
      const state = m.getData('stoneState');
      add(m, () => s.getStoneMonsterHitbox(m), () => s.damageStoneMonster(m, 1, 'companion'),
        !['perched', 'ready', 'returning'].includes(state) && (!m.getData('isStoneBoss') || state === 'stunned'));
    });
    s.batsGroup?.getChildren().forEach(m => add(m, () => s.batSystem.getBounds(m), () => s.batSystem.damage(m, 1)));
    [...(s.monkeys || []), ...(s.boss ? [s.boss] : [])].forEach(m => add(m, () => s.enemyBounds(m), () => s.damageMonkey(m, 1, true),
      !m.isBoss || (m.awake && s.worldTime < m.vulnerableUntil && m.hitsLeft > 0)));
    return candidates.sort((a, b) => a.distance - b.distance)[0];
  }
  update(delta = 16) {
    if (animationPaused(this.scene)) return;
    const dt = Math.min(50, Math.max(0, delta)); this.clock += dt;
    if (!this.available()) { this.finish(); return; }
    const h = this.helper(), s = this.scene;
    if (!this.sequence && this.clock < this.helpUntil && this.clock >= this.nextAt && !this.busyHelping()) {
      const target = this.target();
      if (target) {
        const direction = Math.sign(target.x - h.x) || 1;
        this.sequence = { target, elapsed: 0, start: { x: h.x, y: h.y }, direction,
          end: { x: target.x - direction * Math.min(25, target.distance * .25), y: s.gameMode === 'isometric' ? target.y : h.y }, gravity: h.body?.allowGravity };
        h.body?.setVelocity(0, 0); h.body?.setAllowGravity(false);
        h.setData?.('invulnerableUntil', (s.worldTime ?? s.time.now) + 1900);
        this.nextAt = this.clock + HELPER_RETALIATION.cooldown; this.helpUntil = 0;
        playMotionSound(s, 'sfx-helper-curious', .25);
      }
    }
    if (!this.sequence) { this.icon.setVisible(false); return; }
    const seq = this.sequence; seq.elapsed += dt;
    const phase = retaliationPhase(seq.elapsed); this.phase = phase.name;
    if (phase.name === 'done') { this.finish(); return; }
    if (phase.name === 'windup' && seq.lastPhase !== 'windup') playMotionSound(s, 'sfx-helper-brave', .3);
    if (phase.name === 'dash' && seq.lastPhase !== 'dash') playMotionSound(s, 'sfx-helper-bounce', .28);
    seq.lastPhase = phase.name;
    const t = phase.name === 'dash' ? phase.progress : phase.name === 'impact' ? 1 : phase.name === 'return' ? 1 - phase.progress : 0;
    const x = seq.start.x + (seq.end.x - seq.start.x) * t, y = seq.start.y + (seq.end.y - seq.start.y) * t;
    h.setPosition(x, y); h.body?.reset(x, y); h.body?.setVelocity(0, 0);
    this.icon.setVisible(['concern', 'anger', 'windup'].includes(phase.name)).setPosition(x, y - h.displayHeight - 4)
      .setDepth(h.depth + 1).setAlpha(h.alpha);
    if (phase.name === 'impact' && !seq.hit) {
      seq.hit = true;
      if (seq.target.enemy.active && this.targetStillClose(seq.target, h)) {
        seq.target.damage(); playMotionSound(s, 'sfx-companion-hit', .35);
      }
    }
  }
  targetStillClose(target, helper) {
    if (target.enemy.hidden || target.enemy.getData?.('emerging')) return false;
    const b = target.bounds();
    return Math.abs(b.x + b.width / 2 - helper.x) < 60 && Math.abs(b.y + b.height / 2 - helper.y) < 70;
  }
  finish() {
    const h = this.helper();
    if (this.sequence && h?.active) { h.body?.setAllowGravity(this.sequence.gravity ?? false); h.body?.setVelocity(0, 0); }
    this.sequence = null; this.phase = null; this.icon?.setVisible(false);
  }
  destroy() { this.finish(); if (this.original) this.scene[this.method] = this.original; this.scene.events.off('player-hurt', this.onHurt); this.icon.destroy(); }
}
