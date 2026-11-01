import { animationPaused } from './PlayerAnimation.js';

const clamp = n => Math.max(0, Math.min(1, n));

export function moleMotion(mole, now) {
  const key = mole.texture?.key || '';
  if (now < (mole.getData('stunnedUntil') || 0) || key.endsWith('stunned')) return 'stunned';
  if (mole.getData('emerging') || key.endsWith('digging')) return 'dig';
  if (key.endsWith('charging')) return 'windup';
  if (key.endsWith('attacking')) return 'strike';
  return 'move';
}

export function monkeyMotion(monkey) {
  if (monkey.attackPhase === 'windup') return 'windup';
  if (monkey.attackPhase === 'release') return 'strike';
  if (monkey.climbing) return monkey.climbRoute?.phase === 'vertical' ? 'climb' : 'walk';
  return monkey.attackPhase === 'search' ? 'search' : 'idle';
}

export function enemyFrame(state, elapsed, travel = 0, options = {}) {
  if (state === 'walk') return Math.floor(travel / (options.king ? 18 : options.mole ? 9 : 13)) % 4;
  if (state === 'climb') return Math.floor(travel / (options.king ? 17 : 12)) % 4;
  if (state === 'dig') return Math.floor(elapsed / 100) % 4;
  if (state === 'fall') return 1;
  if (state === 'windup') return clamp(elapsed / (options.duration || 800)) < .38 ? 0 : 1;
  if (state === 'strike') return (options.mole ? 0 : 2) + (elapsed < (options.duration || 220) * .55 ? 0 : 1);
  if (state === 'search') return 4 + [0,1,0,3][Math.floor(elapsed / 160) % 4];
  if (state === 'idle') {
    if (options.mole || options.king) return 4 + [0,1,0,2][Math.floor(elapsed / 650) % 4];
    return 4 + [0,3,0,1,0,2,0,3][Math.floor(elapsed / 540) % 8];
  }
  return 0;
}

export default class EnemyAnimation {
  constructor(scene) { this.scene = scene; this.assets = scene.registry.get('enemy-motion-assets'); this.actors = new WeakMap(); }
  record(sprite, state, dt) {
    let record = this.actors.get(sprite);
    if (!record) { record = { x:sprite.x, y:sprite.y, state, elapsed:0, travel:0 }; this.actors.set(sprite, record); }
    const distance = Math.hypot(sprite.x - record.x, sprite.y - record.y);
    record.x = sprite.x; record.y = sprite.y;
    if (record.state !== state) { record.state = state; record.elapsed = 0; record.travel = 0; }
    else record.elapsed += dt;
    if (dt && distance < 60) record.travel += distance;
    return record;
  }
  draw(sprite, state, dt, options = {}) {
    const frames = this.assets?.[sprite.texture?.key];
    if (!frames || !sprite.active) return;
    const record = this.record(sprite, state, dt);
    if (!dt) return;
    const index = enemyFrame(state, record.elapsed, record.travel, options);
    sprite.setFrame(frames[index] || frames[0]); record.frame = index;
  }
  update(delta = 16) {
    const s = this.scene;
    if (!this.assets || animationPaused(s)) return;
    const dt = Math.min(50, Math.max(0, delta)), now = s.time.now;
    for (const group of [s.monsters, s.molesGroup]) group?.getChildren().forEach(mole => {
      if (!mole.active) return;
      let state = moleMotion(mole, now);
      if (state === 'stunned') return;
      const old = this.actors.get(mole), velocity = mole.body?.velocity || {};
      const moving = Math.hypot(velocity.x || 0, velocity.y || 0) > 2
        || old && Math.hypot(mole.x - old.x, mole.y - old.y) > .1;
      const ai = s.moleAIs?.get(mole);
      if (state === 'move') state = ai?.mode === 'falling' ? 'fall' : moving ? 'walk' : 'idle';
      const duration = state === 'windup' ? ai?.chargeMs || 700 : ai?.attackHoldMs || s.monsterAttackDuration || 300;
      this.draw(mole, state, dt, { mole:true, duration });
    });
    for (const m of [...(s.monkeys || []), ...(s.boss ? [s.boss] : [])]) {
      if (!m.active || m.hidden || s.worldTime < m.stunnedUntil) continue;
      const state = monkeyMotion(m), sprite = m.sprite;
      const pose = state === 'climb' ? 'climbing' : ['windup','strike'].includes(state) ? 'throwing' : null;
      const key = m.isBoss ? 'monkey-king' + (pose ? '-' + pose : '') : 'monkey-' + m.kind + (pose ? '-' + pose : '');
      if (sprite.texture.key !== key) sprite.setTexture(key);
      this.draw(sprite, state, dt, { king:m.isBoss, duration:state === 'strike' ? 220 : m.isBoss ? 950 : 800 });
      this.positionAmmunition(m, state);
    }
  }
  positionAmmunition(m, state) {
    const preview = m.throwPreview;
    if (!preview) return;
    const visible = state === 'windup' && m.throwKind !== 'brown'; preview.setVisible(visible);
    if (!visible) return;
    const sprite = m.sprite, index = Math.min(1, this.actors.get(sprite)?.frame || 0);
    const spec = this.scene.registry.get('enemy-motion-layouts')[m.isBoss ? 'king' : 'monkey'];
    const frame = spec.frames[8 + index], [x,y,r] = frame.ammo, [rootX,rootY] = frame.root;
    preview.setPosition(sprite.x + (sprite.flipX ? -1 : 1) * (x - rootX) * spec.unit * Math.abs(sprite.scaleX),
      sprite.y + ((y - rootY) * spec.unit - 3) * Math.abs(sprite.scaleY));
    preview.setDisplaySize(r * 2.12 * spec.unit * Math.abs(sprite.scaleX), r * 2.12 * spec.unit * Math.abs(sprite.scaleY));
  }
  destroy() { this.actors = new WeakMap(); }
}
