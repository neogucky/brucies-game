export default class MonsterSpawner {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.type = options.type || "normal";
    this.spawnRate = options.spawnRate ?? 10000;
    this.randomizer = options.randomizer ?? 0;
    this.locationMode = options.locationMode || "random";
    this.fixedPosition = options.fixedPosition || { x: 480, y: 300 };
    this.once = Boolean(options.once);
    this.timer = null;
    this.active = false;
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.scheduleNext();
  }

  triggerSpawning() {
    if (!this.active) {
      this.active = true;
    }
    this.spawn();
    if (!this.once) {
      this.scheduleNext();
    }
  }

  stop() {
    this.active = false;
    if (this.timer) {
      this.timer.remove(false);
      this.timer = null;
    }
  }

  scheduleNext() {
    if (!this.active) return;
    const delay = Math.max(0, this.spawnRate - Phaser.Math.Between(0, this.randomizer));
    this.timer = this.scene.time.delayedCall(delay, () => {
      if (!this.active) return;
      this.spawn();
      if (!this.once) {
        this.scheduleNext();
      } else {
        this.stop();
      }
    });
  }

  spawn() {
    if (this.locationMode === "fixed") {
      this.scene.spawnMonster(this.type, this.locationMode, this.fixedPosition);
    } else {
      this.scene.spawnMonster(this.type, this.locationMode);
    }
  }

  setSpawnRate(spawnRate) {
    this.spawnRate = spawnRate;
  }

  setRandomizer(randomizer) {
    this.randomizer = randomizer;
  }

  setLocationMode(locationMode) {
    this.locationMode = locationMode;
  }

  setType(type) {
    this.type = type;
  }
}
