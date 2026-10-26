export const WEAPON_SWITCH_MS = 200;

export default class WeaponSwitch {
  constructor(scene) {
    this.scene = scene; this.hand = 'melee'; this.now = 0; this.shotUntil = 0; this.originals = new Map();
    const method = scene.sys.settings.key === 'UndergroundDigScene' ? 'digBlock' : scene.swingSword ? 'swingSword' : 'startSwing';
    if (scene[method]) {
      const original = scene[method]; this.originals.set(method, original);
      scene[method] = (...args) => this.request('melee', () => original.apply(scene, args));
    }
  }
  blocked() { const s=this.scene; return s.climbingVine || s.isPaused || s.inventoryOpen || s.confirmation?.isOpen || s.isGameOver || s.levelCompleted || s.isComplete; }
  request(kind, action) {
    if (this.blocked()) return false;
    if (kind === 'bow' && this.scene.hammerCharge?.holding) return false;
    if (this.pending) { if (this.pending.kind === kind) this.pending.action = action; return false; }
    if (kind === this.hand) return action();
    if (this.scene.isSwinging || this.scene.hammerSlamActive) return false;
    this.pending = { kind, action, readyAt: this.now + WEAPON_SWITCH_MS }; return false;
  }
  update(dt) {
    if (this.scene.climbingVine) { this.pending = null; this.hand = 'melee'; this.shotUntil = 0; this.backShield?.setVisible(false); return; }
    if (this.blocked()) return;
    if (this.hand === 'bow' && !(this.scene.equipped.secondary === 'bow' || this.scene.equipped.passive === 'bow')) {
      this.hand = 'melee'; this.pending = null;
    }
    this.now += Math.max(0, Math.min(.05, dt)) * 1000;
    if (this.pending && this.now + .01 >= this.pending.readyAt) {
      const pending=this.pending; this.pending=null; this.hand=pending.kind; pending.action();
    }
    this.syncAppearance();
  }
  syncAppearance() {
    const s=this.scene, p=s.player; if (!p?.active) return;
    const hand=this.pending?.kind || this.hand;
    if (hand === 'bow') {
      const female=s.registry.get('saveData')?.playerGender === 'female', prefix=female ? 'knight-female-bow-' : 'knight-bow-';
      const pose=this.now < this.shotUntil ? this.aimUp ? 'up' : s.isDucking ? 'crouching' : 'hitting' : 'standing';
      if (s.textures.exists(prefix+pose)) p.setTexture(prefix+pose);
    } else if (!s.isSwinging && !s.hammerSlamActive && p.texture?.key?.includes('-bow-')) p.setTexture(p.getData(s.isDucking ? 'crouchTexture' : 'standingTexture'));
    const shield=s.equipped?.shield;
    if (shield && !this.backShield) this.backShield=s.add.image(p.x,p.y,shield === 'jungleShield' ? 'item-jungle-shield' : 'item-shield').setDisplaySize(30,32);
    if (this.backShield) {
      this.backShield.setVisible(Boolean(shield));
      if (shield) this.backShield.setTexture(shield === 'jungleShield' ? 'item-jungle-shield' : 'item-shield');
      this.backShield.setPosition(p.x + (p.flipX ? -17 : 17), p.body.y+p.body.height*.4).setDepth(p.depth-1);
    }
  }
  destroy() { this.originals.forEach((fn,name)=>this.scene[name]=fn); this.backShield?.destroy(); this.pending=null; }
}
