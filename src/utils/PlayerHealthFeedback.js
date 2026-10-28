const WARNING_PERIOD = 1200;

export default class PlayerHealthFeedback {
  constructor(scene) {
    this.scene = scene;
    this.elapsed = 0;
    this.warning = false;
    this.onHurt = ({ amount, health }) => {
      if (amount <= 0) return;
      scene.sound.play('sfx-player-hurt', { volume: .65 });
      if (health !== 1) this.stopWarning();
    };
    this.onPause = () => this.stopWarning();
    scene.events.on('player-hurt', this.onHurt);
    scene.events.on('pause', this.onPause);
  }

  canWarn() {
    const s = this.scene;
    return s.health === 1 && s.player?.active !== false && !s.isPaused && !s.inventoryOpen
      && !s.isGameOver && !s.isComplete && !s.levelCompleted && !s.isEditorMode && !s.isHitboxEditMode
      && !s.time?.paused && !s.physics?.world?.isPaused && !s.confirmation?.isOpen
      && !s.dialog?.container?.visible && !s.startScreen?.active;
  }

  beep() {
    this.beepSound ??= this.scene.sound.add('sfx-low-health', { volume: .35 });
    this.beepSound.play();
  }

  update(delta = 16) {
    if (!this.canWarn()) { this.stopWarning(); return; }
    if (!this.warning) {
      this.warning = true;
      this.elapsed = 0;
      this.beep();
    } else {
      const previousCycle = Math.floor(this.elapsed / WARNING_PERIOD);
      this.elapsed += Math.max(0, Math.min(250, delta));
      if (Math.floor(this.elapsed / WARNING_PERIOD) !== previousCycle) this.beep();
    }
    // Full hearts fill from the left. Only the remaining full heart pulses.
    this.heart = this.scene.hud?.hearts?.[0];
    this.heart?.setAlpha(.25 + .75 * (.5 + .5 * Math.cos(this.elapsed / WARNING_PERIOD * Math.PI * 2)));
  }

  stopWarning() {
    this.warning = false;
    this.elapsed = 0;
    this.heart?.setAlpha(1);
    this.heart = null;
    if (this.beepSound?.isPlaying) this.beepSound.stop();
  }

  destroy() {
    this.stopWarning();
    this.beepSound?.destroy();
    this.beepSound = null;
    this.scene.events.off('player-hurt', this.onHurt);
    this.scene.events.off('pause', this.onPause);
  }
}
