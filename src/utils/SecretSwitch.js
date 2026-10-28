import { BONUS_CHALLENGES, bonusState, unlockBonus } from './bonusChallenges.js';
import { saveProgress } from '../saveManager.js';
import LeverInteraction, { leverHandle } from './LeverInteraction.js';
import LeverVisual from './LeverVisual.js';

// The terrain conceals the switch, rather than a distance-based visibility rule.
export default class SecretSwitch {
  constructor(scene, world) {
    this.scene = scene; this.world = world; this.config = BONUS_CHALLENGES[world];
    const { x, y } = this.config.lever, cover = this.config.cover;
    this.visual = new LeverVisual(scene, world, x, y);
    const found = bonusState(scene.registry.get('saveData') || {}, world).status !== 'locked';
    if (cover.kind === 'earth') {
      this.cover = scene.blockMap.get(`${cover.col},${cover.row}`);
      if (found && this.cover) {
        scene.blocks.remove(this.cover, true, true); scene.blockMap.delete(`${cover.col},${cover.row}`);
        this.cover = null;
      } else this.cover?.setTint(cover.tint);
    } else if (!found) {
      this.cover = scene.add.image(x + (cover.offsetX || 0), y + (cover.offsetY ?? 6), cover.texture).setOrigin(.5, 1)
        .setDisplaySize(cover.width || 92, cover.height || 72).setTint(cover.tint).setAlpha(cover.alpha ?? 1).setDepth(3);
    }
    this.wasCovered = Boolean(this.cover?.active); this.revealedAt = -Infinity;
    this.zone = scene.add.zone(x, y - 25, 80, 74).setDepth(12).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.activate());
    this.hint = scene.add.text(x, y - 84, 'Hebel umlegen · {confirm}', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '16px', color: '#fff1b3',
      backgroundColor: '#293e30', padding: { x: 8, y: 6 }, stroke: '#17291e', strokeThickness: 2,
    }).setOrigin(.5).setDepth(70).setVisible(false).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.activate());
    this.onEnter = () => this.activate(); scene.input?.keyboard?.on('keydown-ENTER', this.onEnter);
    scene.events.on('update', this.update, this); scene.events.once('shutdown', this.destroy, this);
    this.update();
  }
  ready() {
    const s = this.scene;
    return !s.isLoading && !s.startScreen?.visible && !s.isPaused && !s.isGameOver && !s.levelCompleted
      && !s.isComplete && !s.inventoryOpen && !s.dialog?.container?.visible && !s.confirmation?.isOpen
      && !s.isEditorMode && !s.isHitboxEditMode && !s.isInteractingWithLever;
  }
  hitPlantCover() {
    const s = this.scene;
    if (this.config.cover.kind !== 'bush' || !this.cover?.active || !s.isSwinging || s.hammerSlamActive || s.climbingVine) return;
    const now = s.worldTime ?? s.time.now;
    if (now < (s.swingReadyAt || 0) || s.swordHitbox?.body?.enable === false) return;
    const hit = s.getMeleeBounds?.() || s.swordHitbox?.getBounds?.(), plant = this.cover.getBounds();
    if (!hit || hit.x >= plant.right || hit.x + hit.width <= plant.x || hit.y >= plant.bottom || hit.y + hit.height <= plant.y) return;
    this.cover.destroy(); s.sound.play('sfx-digging-earth', { volume: .3 });
  }
  update(_time, delta = 0) {
    if (this.interaction?.active) { this.interaction.update(delta); return; }
    const s = this.scene, { x, y } = this.config.lever, body = s.player?.body;
    if (!body) return;
    const ready = this.ready();
    if (ready) this.hitPlantCover();
    this.covered = Boolean(this.cover?.active);
    if (this.wasCovered && !this.covered) this.revealedAt = s.worldTime ?? s.time.now;
    this.wasCovered = this.covered;
    const distance = Math.hypot(body.center.x - x, body.bottom - y);
    this.near = ready && distance < 72; this.clear = !this.covered;
    if (this.near && this.clear && s.blocks?.getChildren) {
      this.clear = !s.blocks.getChildren().some(block => {
        if (!block.active) return false; const b = block.getBounds();
        for (let p = .1; p <= 1; p += .1) {
          const px = body.center.x + (x - body.center.x) * p, py = body.bottom - 16 + (y - body.bottom) * p;
          if (px > b.x && px < b.right && py > b.y && py < b.bottom) return true;
        }
        return false;
      });
    }
    const on = bonusState(s.registry.get('saveData') || {}, this.world).status !== 'locked';
    // The desert mechanism shows through the leaves, with its base still hidden.
    // It still has to be struck before the lever can be pulled.
    this.visual.setVisible(!this.covered || this.world === 'desert'); this.zone.setVisible(!this.covered && ready && !on);
    this.hint.setVisible(!on && this.near && this.clear && !this.covered && ready);
    if (this.visual.visible) this.visual.draw(leverHandle(x, y, on ? 1 : 0));
  }
  activate() {
    if (this.interaction?.active) return false;
    this.update();
    const s = this.scene, now = s.worldTime ?? s.time.now;
    if (!this.ready() || !this.near || !this.clear || this.covered || s.isSwinging || s.hammerSlamActive
      || s.hammerCharge?.holding || s.climbingVine || now - this.revealedAt < 650
      || bonusState(s.registry.get('saveData') || {}, this.world).status !== 'locked') return false;
    this.hint.setVisible(false); this.zone.setVisible(false);
    const { x, y } = this.config.lever;
    this.interaction = new LeverInteraction(s, {
      world: this.world, color: this.config.color,
      background: { desert: 'desert-bg', underground: 'underground-bg', jungle: 'jungle-background' }[this.world],
      onProgress: progress => this.visual.draw(leverHandle(x, y, progress)),
      onFinish: () => this.openPassage(),
    });
    return true;
  }
  openPassage() {
    const s = this.scene, save = s.registry.get('saveData') || {}, next = unlockBonus(save, this.world);
    if (next === save) return;
    s.registry.set('saveData', next); saveProgress(next);
    const toast = s.add.container(480, 120).setScrollFactor(0).setDepth(100);
    toast.add(s.add.rectangle(0, 0, 620, 80, 0x193c35, .97).setStrokeStyle(2, 0xe5c77e));
    toast.add(s.add.text(0, 0, 'Geheimgang geöffnet!\n' + this.config.name + ' ist jetzt auf der Weltkarte.', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '22px', color: '#fff0c7', align: 'center' }).setOrigin(.5));
    toast.list.forEach(child => child.setScrollFactor(0));
    s.time.delayedCall(3500, () => toast.destroy());
  }
  destroy() {
    this.interaction?.cancel(); this.interaction = null;
    this.scene.events.off('update', this.update, this);
    this.scene.input?.keyboard?.off('keydown-ENTER', this.onEnter);
    if (this.config.cover.kind === 'bush') this.cover?.destroy();
    this.visual.destroy(); this.zone.destroy(); this.hint.destroy();
  }
}
