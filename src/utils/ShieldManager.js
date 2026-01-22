export default class ShieldManager {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.cooldownMs = options.cooldownMs ?? 20000;
    this.owned = false;
    this.active = false;
    this.cooldownUntil = 0;
    this.cooldownStartedAt = 0;
    this.bubble = null;
    this.hud = null;
    this.player = null;
  }

  initFromSave(saveData) {
    this.owned = Boolean(saveData?.equipment?.shield);
    this.active = this.owned;
    this.cooldownUntil = 0;
    this.syncHud();
  }

  attach(player) {
    this.player = player;
    if (!this.bubble) {
      this.bubble = this.scene.add.circle(player.x, player.y, 37, 0x8fd3ff, 0.35);
      this.bubble.setDepth(4);
    }
    this.bubble.setVisible(this.active);
  }

  setHud(hud) {
    this.hud = hud;
    this.syncHud();
  }

  tryBlockHit() {
    if (!this.owned || !this.active) return false;
    this.active = false;
    this.cooldownStartedAt = this.scene.time.now;
    this.cooldownUntil = this.scene.time.now + this.cooldownMs;
    if (this.scene.sound?.play) {
      this.scene.sound.play("sfx-shield-impact");
    }
    if (this.bubble) {
      this.bubble.setVisible(false);
    }
    this.syncHud();
    return true;
  }

  update() {
    if (!this.player) return;
    if (this.owned && !this.active && this.cooldownUntil) {
      if (this.scene.time.now >= this.cooldownUntil) {
        this.active = true;
        this.cooldownUntil = 0;
        this.cooldownStartedAt = 0;
        if (this.bubble) {
          this.bubble.setVisible(true);
        }
      }
      this.syncHud();
    }
    if (this.bubble) {
      this.bubble.setPosition(this.player.x, this.player.y);
      this.bubble.setVisible(this.active);
    }
  }

  syncHud() {
    if (!this.hud) return;
    this.hud.setPassiveOwned(this.owned);
    const now = this.scene.time.now;
    const progress = this.cooldownStartedAt
      ? Math.min(1, Math.max(0, (now - this.cooldownStartedAt) / this.cooldownMs))
      : 0;
    this.hud.setPassiveCooldown({
      owned: this.owned,
      active: this.active,
      ratio: this.cooldownUntil ? progress : 0,
    });
  }

  destroy() {
    if (this.bubble) {
      this.bubble.destroy();
      this.bubble = null;
    }
    this.player = null;
    this.hud = null;
  }
}
