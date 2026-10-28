import { planMapDiscovery, rememberMapDiscovery } from './mapDiscovery.js';
import { getWorldMapRoute, pointOnMapRoute } from './worldMapRoutes.js';
import { saveProgress } from '../saveManager.js';

export default class WorldMapDiscovery {
  constructor(scene, world, nodes, exits = []) {
    this.scene = scene; this.world = world; this.nodes = nodes; this.exits = exits;
    this.exitObjects = new Map(); this.progress = new Map(); this.destroyed = false;
    this.spark = scene.add.graphics().setDepth(3);
    scene.mapDiscovery = this;
    this.refresh();
    scene.events.on('update', this.update, this);
    scene.events.once('shutdown', this.destroy, this);
  }

  refresh() {
    const scene = this.scene, save = scene.registry.get('saveData') || {};
    this.testing = scene.registry.get('unlockAllForTesting') === true;
    const plan = planMapDiscovery(save, this.world, this.nodes, this.exits, scene.unlocked, scene.currentNode?.id, this.testing);
    this.visibleNodes = plan.visibleNodes; this.visiblePaths = plan.visiblePaths; this.queue = plan.steps;
    this.activeStep = null; this.elapsed = 0; this.progress.clear();
    for (const [id, marker] of scene.nodeSprites || []) this.setMarkerVisible(marker, this.visibleNodes.has(id));
    for (const [id, objects] of this.exitObjects) for (const object of objects) object.setVisible(this.visibleNodes.has(id));
    scene.isRevealingMap = this.queue.length > 0;
    this.redraw();
    this.remember();
  }

  watchExit(id, objects) {
    this.exitObjects.set(id, objects);
    for (const object of objects) object.setVisible(this.visibleNodes.has(id));
  }

  setMarkerVisible(marker, visible) {
    for (const object of [marker.shadow, marker.icon, marker.label, ...(marker.extras || [])]) object?.setVisible(visible);
  }

  remember() {
    if (this.testing) return;
    const save = this.scene.registry.get('saveData') || {};
    const next = rememberMapDiscovery(save, this.world, this.visibleNodes, this.visiblePaths);
    this.scene.registry.set('saveData', next); saveProgress(next);
  }

  redraw() { this.scene.pathGraphics?.redraw?.(); }

  update(_time, delta = 0) {
    if (this.destroyed || !this.scene.isRevealingMap || this.scene.isMoving || this.scene.isDialogOpen) return;
    if (!this.activeStep) {
      this.activeStep = this.queue.shift();
      if (!this.activeStep) { this.scene.isRevealingMap = false; this.spark.clear(); return; }
      this.route = getWorldMapRoute(this.world, this.activeStep.from, this.activeStep.to);
      this.duration = Math.max(900, Math.min(2200, this.route.length * 4.5));
      this.elapsed = 0; this.lastPaint = -100; this.visiblePaths.add(this.activeStep.id);
    }
    this.elapsed += Math.max(0, Math.min(100, delta));
    const p = Math.min(1, this.elapsed / this.duration);
    this.progress.set(this.activeStep.id, { from: this.activeStep.from.id, fraction: p });
    if (p === 1 || this.elapsed - this.lastPaint >= 40) { this.redraw(); this.lastPaint = this.elapsed; }
    const head = pointOnMapRoute(this.route, this.route.length * p);
    this.spark.clear().fillStyle(0xffe4a3, .26).fillCircle(head.x, head.y, 13)
      .fillStyle(0xfff2ca, .85).fillCircle(head.x, head.y, 3);
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.4 + this.elapsed / 350, radius = 7 + i * 2;
      this.spark.fillStyle(0xffd684, .65).fillCircle(head.x + Math.cos(angle) * radius, head.y + Math.sin(angle) * radius * .5, 1.7);
    }
    if (p < 1) return;
    const step = this.activeStep;
    if (step.newNode) {
      this.visibleNodes.add(step.newNode);
      const marker = this.scene.nodeSprites?.get(step.newNode);
      if (marker) {
        this.setMarkerVisible(marker, true);
        const y = marker.icon.y;
        marker.icon.setAlpha(0).setScale(.88).setY(y + 12);
        marker.label.setAlpha(0);
        this.scene.tweens.add({ targets: marker.icon, alpha: 1, scale: 1, y, duration: 450, ease: 'Back.Out' });
        this.scene.tweens.add({ targets: marker.label, alpha: 1, duration: 350 });
      }
      for (const object of this.exitObjects.get(step.newNode) || []) object.setVisible(true);
      this.scene.sound?.play('sfx-key-open', { volume: .22 });
    }
    this.progress.delete(step.id); this.activeStep = null; this.spark.clear();
    this.remember();
    if (!this.queue.length) this.scene.isRevealingMap = false;
  }

  destroy() {
    this.destroyed = true; this.scene.isRevealingMap = false;
    this.scene.events.off('update', this.update, this);
    if (this.scene.mapDiscovery === this) this.scene.mapDiscovery = null;
  }
}
