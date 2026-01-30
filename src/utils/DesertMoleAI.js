export default class DesertMoleAI {
  constructor(scene, mole, options = {}) {
    this.scene = scene;
    this.mole = mole;
    this.tileSize = options.tileSize ?? 38;
    this.blockMap = options.blockMap;
    this.onDig = options.onDig;
    this.digSoundKey = options.digSoundKey || null;
    this.attackTexture = options.attackTexture || "desert-mole-attacking";
    this.runTexture = options.runTexture || "desert-mole-running";
    this.speed = options.speed ?? 80;
    this.attackHoldMs = options.attackHoldMs ?? 180;
    this.waitMs = options.waitMs ?? 2000;
    this.direction = null;
    this.directionUntil = 0;
    this.lastDir = null;
    this.nextActionAt = scene.time.now + this.waitMs;
    this.attackUntil = 0;
    this.canSeePlayer = options.canSeePlayer || null;
    this.getPlayerPos = options.getPlayerPos || null;
    this.onAttack = options.onAttack || null;
    this.attackRange = options.attackRange ?? this.tileSize * 0.6;
    this.attackCooldownMs = options.attackCooldownMs ?? 800;
    this.lastAttackAt = 0;
    this.digCheckAt = 0;
  }

  update(now, deltaMs) {
    if (!this.mole?.active) return;
    if (this.attackUntil && now < this.attackUntil) {
      this.mole.body?.setVelocity(0, 0);
      return;
    }
    const seesPlayer = this.canSeePlayer?.();
    if (seesPlayer) {
      this.chasePlayer(now);
      return;
    }
    if (now >= this.directionUntil) {
      this.pickDirection(now);
    }
    this.moveInDirection(now, deltaMs);
  }

  pickDirection(now) {
    const restricted = this.isRestrictedToHorizontal();
    const actions = [
      { dx: -1, dy: 0, duration: 1500 },
      { dx: 1, dy: 0, duration: 1500 },
      { dx: 0, dy: -1, duration: 1100 },
      { dx: 0, dy: 1, duration: 1100 },
    ];
    let candidates = restricted ? actions.filter((action) => action.dy === 0) : actions;
    if (this.lastDir) {
      const opp = { dx: -this.lastDir.dx, dy: -this.lastDir.dy };
      const filtered = candidates.filter((action) => action.dx !== opp.dx || action.dy !== opp.dy);
      if (filtered.length) {
        candidates = filtered;
      }
    }
    const choice = Phaser.Utils.Array.GetRandom(candidates);
    this.direction = { dx: choice.dx, dy: choice.dy };
    this.directionUntil = now + choice.duration;
    this.lastDir = { dx: choice.dx, dy: choice.dy };
  }

  chasePlayer(now) {
    if (!this.getPlayerPos) return;
    const player = this.getPlayerPos();
    const dx = player.x - this.mole.x;
    const dy = player.y - this.mole.y;
    if (Math.abs(dy) < this.tileSize * 0.4 && Math.abs(dx) <= this.attackRange) {
      this.tryAttack(now);
      return;
    }
    const dirX = dx === 0 ? 0 : Math.sign(dx);
    this.direction = { dx: dirX, dy: 0 };
    this.moveInDirection(now, this.scene.game?.loop?.delta ?? 16);
  }

  moveInDirection(now, deltaMs) {
    if (!this.direction) {
      this.mole.body?.setVelocity(0, 0);
      return;
    }
    const { dx, dy } = this.direction;
    if (dx === 0 && dy === 0) {
      this.mole.body?.setVelocity(0, 0);
      return;
    }
    if (this.shouldStopForBlock(dx, dy, now)) {
      this.directionUntil = now;
      this.mole.body?.setVelocity(0, 0);
      return;
    }
    if (this.mole.texture?.key !== this.runTexture) {
      this.mole.setTexture(this.runTexture);
    }
    if (dx !== 0) {
      this.mole.setFlipX(dx < 0);
    }
    const vx = dx * this.speed;
    const vy = dy * this.speed;
    this.mole.body?.setVelocity(vx, vy);
  }

  shouldStopForBlock(dx, dy, now) {
    const { col, row } = this.getTilePosition();
    const nextCol = col + Math.sign(dx);
    const nextRow = row + Math.sign(dy);
    if (!this.isInBounds(nextCol, nextRow)) return true;
    const block = this.blockMap.get(`${nextCol},${nextRow}`);
    if (!block) return false;
    const type = block.getData("type");
    if (type === "earth") {
      if (!this.hasSolidAhead(nextCol, nextRow, Math.sign(dx), Math.sign(dy))) {
        return true;
      }
      if (now >= this.digCheckAt) {
        const didDig = this.onDig?.(nextCol, nextRow);
        if (didDig) {
          this.playDigAttack();
        }
        this.digCheckAt = now + 200;
      }
      return false;
    }
    return true;
  }

  tryAttack(now) {
    if (now - this.lastAttackAt < this.attackCooldownMs) {
      this.mole.body?.setVelocity(0, 0);
      return;
    }
    this.lastAttackAt = now;
    this.playDigAttack();
    this.onAttack?.();
  }

  playDigAttack() {
    this.mole.setTexture(this.attackTexture);
    this.attackUntil = this.scene.time.now + this.attackHoldMs;
    if (this.digSoundKey) {
      this.scene.sound?.play?.(this.digSoundKey);
    }
    this.scene.time.delayedCall(this.attackHoldMs, () => {
      if (this.mole?.active) {
        this.mole.setTexture(this.runTexture);
      }
      this.attackUntil = 0;
    });
  }

  hasSolidAhead(col, row, dx, dy) {
    const nextCol = col + dx;
    const nextRow = row + dy;
    const next = this.blockMap.get(`${nextCol},${nextRow}`);
    if (!next) return false;
    const type = next.getData("type");
    return type === "earth" || type === "stone" || type === "black";
  }

  isRestrictedToHorizontal() {
    const { col, row } = this.getTilePosition();
    const above = this.blockMap.get(`${col},${row - 1}`);
    const below = this.blockMap.get(`${col},${row + 1}`);
    if (above) return false;
    const belowType = below?.getData("type");
    return belowType === "stone" || belowType === "black";
  }

  isInBounds(col, row) {
    return col >= 0 && row >= 0 && col < this.scene.gridCols && row < this.scene.gridRows;
  }

  getTilePosition() {
    const col = Math.floor(this.mole.x / this.tileSize);
    const row = Math.floor((this.mole.y - 1) / this.tileSize);
    return { col, row };
  }
}
