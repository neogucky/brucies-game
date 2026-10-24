export const BAT_STATS = {
  hp: 2, speed: 74, climbSpeed: 100, chargeMs: 450, dropMs: 2900,
  contactDamage: 1, berryDamage: 2, stunMs: 350, berryGravity: 700,
};

function boundsAt(x, y, width, height) {
  return { x: x - width / 2, y: y - height / 2, width, height,
    right: x + width / 2, bottom: y + height / 2 };
}
function intersects(a, b) {
  return a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
}
function approach(value, target, step) {
  return value + Math.sign(target - value) * Math.min(Math.abs(target - value), step);
}

export default class UndergroundBats {
  constructor(scene, entries = []) {
    this.scene = scene;
    this.group = scene.add.group();
    this.berries = scene.add.group();
    scene.batsGroup = this.group;
    scene.poisonBerriesGroup = this.berries;
    entries.forEach((entry, index) => this.spawn(entry, index));
  }

  spawn(entry, index = 0) {
    const tile = this.scene.tileSize;
    if (!Number.isFinite(entry.col) || !Number.isFinite(entry.row)) return null;
    const x = (entry.col + .5) * tile;
    let y = (entry.row + .5) * tile;
    if (!this.isClearAt(x, y)) return null;
    y = this.ceilingY(x, y);
    const bat = this.scene.add.sprite(x, y, "cave-bat-up")
      .setDisplaySize(86, 60).setDepth(4);
    bat.setData("hp", BAT_STATS.hp);
    bat.setData("maxHp", BAT_STATS.hp);
    bat.setData("flightY", y);
    bat.setData("minX", ((entry.minCol ?? entry.col - 3) + .5) * tile);
    bat.setData("maxX", ((entry.maxCol ?? entry.col + 3) + .5) * tile);
    bat.setData("dir", index % 2 ? -1 : 1);
    bat.setData("speed", entry.speed ?? BAT_STATS.speed);
    bat.setData("dropMs", entry.dropMs ?? BAT_STATS.dropMs);
    bat.setData("nextDropAt", this.scene.time.now + 1400 + index * 400);
    bat.setData("bobOffset", index * 700);
    bat.play("cave-bat-flight");
    this.group.add(bat);
    return bat;
  }

  getBounds(bat) {
    return boundsAt(bat.x, bat.y, 34, 24);
  }

  blockHit(bounds) {
    const scene = this.scene, tile = scene.tileSize;
    for (let row = Math.floor(bounds.y / tile); row <= Math.floor((bounds.bottom - .01) / tile); row += 1) {
      for (let col = Math.floor(bounds.x / tile); col <= Math.floor((bounds.right - .01) / tile); col += 1) {
        const block = scene.blockMap.get(col + "," + row);
        if (block && block.active !== false) return { col, row, y: row * tile };
        if (col < 0 || row < 0 || col >= scene.gridCols || row >= scene.gridRows) return { col, row, y: row * tile };
      }
    }
    return null;
  }

  isClearAt(x, y) {
    return !this.blockHit(boundsAt(x, y, 40, 28));
  }

  ceilingY(x, y) {
    const tile = this.scene.tileSize;
    const left = Math.floor((x - 20) / tile), right = Math.floor((x + 20) / tile);
    for (let row = Math.floor(y / tile); row >= 0; row -= 1) {
      for (let col = left; col <= right; col += 1) {
        const block = this.scene.blockMap.get(col + "," + row);
        if (block && block.active !== false) return (row + 1) * tile + 23;
      }
    }
    return 23;
  }

  underpassY(x, nextX, y) {
    const limit = (this.scene.gridRows - 1) * this.scene.tileSize - 16;
    for (let candidate = y + 4; candidate <= limit; candidate += 4) {
      if (!this.isClearAt(x, candidate)) return null;
      if (this.isClearAt(nextX, candidate)) return candidate;
    }
    return null;
  }

  update(deltaSec) {
    const scene = this.scene;
    if (scene.isPaused || scene.isGameOver || scene.levelCompleted || scene.isEditorMode) return;
    const dt = Math.min(.05, Math.max(0, deltaSec));
    [...this.group.getChildren()].forEach(bat => this.updateBat(bat, dt));
    [...this.berries.getChildren()].forEach(berry => this.updateBerry(berry, dt));
  }

  updateBat(bat, dt) {
    if (!bat.active) return;
    const scene = this.scene, now = scene.time.now;
    if (now < (bat.getData("stunnedUntil") || 0)) return;
    bat.clearTint();
    if (!bat.getData("chargeUntil")) {
      bat.play("cave-bat-flight", true);
      let dir = bat.getData("dir"), y = bat.getData("flightY");
      let nextX = bat.x + dir * bat.getData("speed") * dt;
      if (nextX < bat.getData("minX") || nextX > bat.getData("maxX")) {
        dir = -dir; bat.setData("dir", dir);
        nextX = bat.x + dir * bat.getData("speed") * dt;
      }
      if (this.isClearAt(nextX, y)) {
        bat.x = nextX;
        const nextY = approach(y, this.ceilingY(bat.x, y), BAT_STATS.climbSpeed * dt);
        if (this.isClearAt(bat.x, nextY)) y = nextY;
      } else {
        const underpass = this.underpassY(bat.x, nextX, y);
        if (underpass !== null) {
          const nextY = approach(y, underpass, BAT_STATS.climbSpeed * dt);
          if (this.isClearAt(bat.x, nextY)) y = nextY;
        } else bat.setData("dir", -dir);
      }
      bat.setData("flightY", y);
      bat.y = y + Math.sin((now + bat.getData("bobOffset")) / 260) * 3;
      bat.setFlipX(bat.getData("dir") < 0);
      const body = scene.player?.body;
      if (body && now >= bat.getData("nextDropAt") &&
        Math.abs(scene.player.x - bat.x) < scene.tileSize * 6 && body.bottom > bat.y + 30) {
        this.startCharge(bat);
      }
    } else {
      const charge = bat.getData("chargeVisual");
      charge?.setPosition(bat.x, bat.y + 22);
      if (now >= bat.getData("chargeUntil")) {
        this.cancelCharge(bat);
        this.dropBerry(bat);
        bat.setData("nextDropAt", now + bat.getData("dropMs"));
      }
    }
    const body = scene.player?.body;
    if (body && intersects(this.getBounds(bat), boundsAt(body.x + body.width / 2, body.y + body.height / 2, body.width, body.height))) {
      scene.applyFlyingEnemyHit(BAT_STATS.contactDamage);
    }
  }

  startCharge(bat) {
    bat.setData("chargeUntil", this.scene.time.now + BAT_STATS.chargeMs);
    bat.anims.stop();
    bat.setTexture("cave-bat-drop");
    const preview = this.scene.add.image(bat.x, bat.y + 22, "poison-berry")
      .setDisplaySize(14, 16).setTint(0xc6ff87).setDepth(5);
    bat.setData("chargeVisual", preview);
  }

  cancelCharge(bat) {
    bat.getData("chargeVisual")?.destroy();
    bat.setData("chargeVisual", null);
    bat.setData("chargeUntil", 0);
  }

  dropBerry(bat) {
    const berry = this.scene.add.image(bat.x, bat.y + 25, "poison-berry")
      .setDisplaySize(18, 20).setDepth(5);
    berry.setData("velocityY", 65);
    this.berries.add(berry);
    return berry;
  }

  updateBerry(berry, dt) {
    if (!berry.active) return;
    const velocity = berry.getData("velocityY") + BAT_STATS.berryGravity * dt;
    berry.setData("velocityY", velocity);
    const distance = velocity * dt;
    // Small swept steps keep fast berries from passing through a platform or player.
    const steps = Math.max(1, Math.ceil(distance / 6));
    for (let i = 0; i < steps; i += 1) {
      berry.y += distance / steps;
      const bounds = boundsAt(berry.x, berry.y, 10, 12);
      const block = this.blockHit(bounds);
      if (block) { this.burstBerry(berry, berry.x, block.y); return; }
      const body = this.scene.player?.body;
      if (body && intersects(bounds, boundsAt(body.x + body.width / 2, body.y + body.height / 2, body.width, body.height))) {
        this.scene.applyFlyingEnemyHit(BAT_STATS.berryDamage);
        this.burstBerry(berry);
        return;
      }
    }
  }

  burstBerry(berry, x = berry.x, y = berry.y) {
    if (!berry.active) return;
    this.berries.remove(berry, true, true);
    const splash = this.scene.add.ellipse(x, y, 28, 9, 0xa5e45c, .75).setDepth(5);
    this.scene.tweens.add({ targets: splash, alpha: 0, scaleX: 1.5,
      duration: 240, onComplete: () => splash.destroy() });
  }

  damage(bat, amount) {
    if (!bat?.active) return false;
    this.cancelCharge(bat);
    const hp = Math.max(0, bat.getData("hp") - amount);
    bat.setData("hp", hp);
    if (!hp) {
      this.scene.sfx?.monsterDeath?.play();
      this.group.remove(bat, true, true);
    } else {
      bat.setData("stunnedUntil", Math.max(bat.getData("stunnedUntil") || 0, this.scene.time.now + BAT_STATS.stunMs));
      bat.setData("nextDropAt", Math.max(bat.getData("nextDropAt") || 0, this.scene.time.now + 1000));
      bat.anims.stop();
      bat.setTexture("cave-bat-glide").setTint(0xffb4e8);
      this.scene.sfx?.monsterInjured?.play();
    }
    return true;
  }

  removeBefore(wallX) {
    [...this.group.getChildren()].forEach(bat => {
      if (bat.x >= wallX) return;
      this.cancelCharge(bat);
      this.group.remove(bat, true, true);
    });
    [...this.berries.getChildren()].forEach(berry => {
      if (berry.x < wallX) this.berries.remove(berry, true, true);
    });
  }

  destroy() {
    this.group.getChildren().forEach(bat => this.cancelCharge(bat));
    this.group.destroy(true);
    this.berries.destroy(true);
  }
}
