export default class DesertMoleAI {
  constructor(scene, mole, options = {}) {
    this.scene = scene;
    this.mole = mole;
    this.tileSize = options.tileSize ?? 38;
    this.blockMap = options.blockMap;
    this.onDig = options.onDig;
    this.digSoundKey = options.digSoundKey || null;
    this.attackTexture = options.attackTexture || "desert-mole-attacking";
    this.chargeTexture = options.chargeTexture || this.attackTexture;
    this.runTexture = options.runTexture || "desert-mole-running";
    this.mirrorX = options.mirrorX ?? false;
    this.speed = options.speed ?? 80;
    this.chaseSpeedMultiplier = options.chaseSpeedMultiplier ?? 1;
    this.fallSpeed = options.fallSpeed ?? 170;
    this.chargeMs = options.chargeMs ?? 0;
    this.attackHoldMs = options.attackHoldMs ?? 180;
    this.pauseMs = options.pauseMs ?? 500;
    this.lookIntervalMs = options.lookIntervalMs ?? 250;
    this.canSeePlayer = options.canSeePlayer || null;
    this.getPlayerPos = options.getPlayerPos || null;
    this.onAttack = options.onAttack || null;
    this.attackRange = options.attackRange ?? this.tileSize * 0.6;
    this.chaseStopDistance = options.chaseStopDistance ?? this.attackRange;
    this.attackCooldownMs = options.attackCooldownMs ?? 800;
    this.onCharge = options.onCharge || null;
    this.onStrike = options.onStrike || null;
    this.lastAttackAt = 0;
    this.nextActionAt = scene.time.now;
    this.action = null;
    this.stepTarget = null;
    this.mode = "idle";
    this.pauseUntil = 0;
    this.lookCount = 0;
    this.nextLookAt = 0;
    this.roamDir = Phaser.Math.RND.pick([-1, 1]);
    this.attackPauseUntil = 0;
    this.attackAnimUntil = 0;
    this.chargeUntil = 0;
    this.pendingAttack = false;
    this.wasFalling = false;
    this.lastPos = new Phaser.Math.Vector2(mole.x, mole.y);
    this.stuckSince = null;
    this.status = "";
  }

  update(now, deltaMs) {
    if (!this.mole?.active) return;
    this.updateAttackAnimation(now);
    this.updateCharge(now);

    if (this.handleFalling(now, deltaMs)) {
      this.logStatus();
      return;
    }

    if (this.attackPauseUntil && now < this.attackPauseUntil) {
      this.mole.body?.setVelocity(0, 0);
      this.logStatus();
      return;
    }

    if (this.pendingAttack) {
      this.mole.body?.setVelocity(0, 0);
      this.logStatus();
      return;
    }

    if (this.canSeePlayer?.()) {
      this.handleChase(now);
      this.checkStuck(now);
      this.logStatus();
      return;
    }

    if (this.mode === "pause") {
      this.handlePause(now);
      this.logStatus();
      return;
    }

    if (this.mode === "roam") {
      this.handleRoam(now);
      this.checkStuck(now);
      this.logStatus();
      return;
    }

    if (this.action) {
      this.handleAction(now);
      this.checkStuck(now);
      this.logStatus();
      return;
    }

    if (now < this.nextActionAt) {
      this.mole.body?.setVelocity(0, 0);
      this.logStatus();
      return;
    }

    this.pickNextAction(now);
    this.logStatus();
  }

  handleFalling(now, deltaMs) {
    if (this.mode === "dig" && this.action?.dy === 1) {
      return false;
    }
    const { col, row } = this.getTilePosition();
    const below = this.blockMap?.get(`${col},${row + 1}`);
    if (!below) {
      this.mole.body?.setVelocity(0, 0);
      this.mole.y += (this.fallSpeed * deltaMs) / 1000;
      this.mode = "falling";
      this.wasFalling = true;
      this.action = null;
      this.stepTarget = null;
      return true;
    }
    this.mole.body?.setVelocity(0, 0);
    if (this.wasFalling) {
      this.wasFalling = false;
      this.mode = "idle";
      this.nextActionAt = now;
      this.mole.y = (row + 1) * this.tileSize;
    }
    return false;
  }

  handlePause(now) {
    this.mole.body?.setVelocity(0, 0);
    if (now >= this.nextLookAt && this.lookCount < 2) {
      this.setFacingLeft(this.lookCount % 2 === 0);
      this.lookCount += 1;
      this.nextLookAt = now + this.lookIntervalMs;
    }
    if (now >= this.pauseUntil) {
      this.mode = "idle";
      this.action = null;
      this.stepTarget = null;
      this.nextActionAt = now;
    }
  }

  handleChase(now) {
    if (!this.getPlayerPos) return;
    const player = this.getPlayerPos();
    const dx = player.x - this.mole.x;
    const dy = player.y - this.mole.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= this.attackRange) {
      this.tryAttack(now);
      return;
    }
    if (distance <= this.chaseStopDistance) {
      this.mole.body?.setVelocity(0, 0);
      return;
    }
    const dir = dx === 0 ? 0 : Math.sign(dx);
    if (dir === 0) {
      this.mole.body?.setVelocity(0, 0);
      return;
    }
    this.setRunTexture();
    this.setFacingLeft(dir < 0);
    if (this.handleHorizontalObstacle(dir, false)) {
      this.mole.body?.setVelocity(0, 0);
      return;
    }
    this.mole.body?.setVelocity(dir * this.speed * this.chaseSpeedMultiplier, 0);
  }

  pickNextAction(now) {
    const { col, row } = this.getTilePosition();
    const leftBlock = this.blockMap?.get(`${col - 1},${row}`);
    const rightBlock = this.blockMap?.get(`${col + 1},${row}`);
    const downBlock = this.blockMap?.get(`${col},${row + 1}`);

    const leftEarth = this.isEarthBlock(leftBlock);
    const rightEarth = this.isEarthBlock(rightBlock);
    const downEarth = this.isEarthBlock(downBlock);

    if (!leftEarth && !rightEarth && !downEarth) {
      this.mode = "roam";
      this.action = null;
      this.stepTarget = null;
      return;
    }

    const actions = [];
    if (leftEarth) actions.push({ dx: -1, dy: 0, steps: Phaser.Math.Between(2, 6) });
    if (rightEarth) actions.push({ dx: 1, dy: 0, steps: Phaser.Math.Between(2, 6) });
    if (downEarth) actions.push({ dx: 0, dy: 1, steps: Phaser.Math.Between(1, 2) });

    if (!actions.length) {
      this.mode = "roam";
      this.action = null;
      this.stepTarget = null;
      return;
    }

    const choice = Phaser.Utils.Array.GetRandom(actions);
    this.action = { type: "dig", dx: choice.dx, dy: choice.dy, stepsRemaining: choice.steps };
    this.mode = "dig";
    this.stepTarget = null;
    this.handleAction(now);
  }

  handleAction(now) {
    if (!this.action || this.action.type !== "dig") return;
    if (!this.stepTarget) {
      const { col, row } = this.getTilePosition();
      const nextCol = col + this.action.dx;
      const nextRow = row + this.action.dy;
      if (!this.isInBounds(nextCol, nextRow)) {
        this.finishAction(now, true);
        return;
      }
      const block = this.blockMap?.get(`${nextCol},${nextRow}`);
      if (block) {
        if (this.isEarthBlock(block)) {
          const didDig = this.onDig?.(nextCol, nextRow);
          if (didDig) this.playDigAnimation();
          this.stepTarget = this.tileToTarget(nextCol, nextRow);
        } else {
          this.finishAction(now, true);
          return;
        }
      } else {
        this.stepTarget = this.tileToTarget(nextCol, nextRow);
      }
    }

    this.moveToTarget(now);
  }

  moveToTarget(now) {
    if (!this.stepTarget) return;
    const { x, y } = this.stepTarget;
    const dx = x - this.mole.x;
    const dy = y - this.mole.y;
    if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2) {
      this.mole.setPosition(x, y);
      this.stepTarget = null;
      this.action.stepsRemaining -= 1;
      if (this.action.stepsRemaining <= 0) {
        this.finishAction(now, false);
      }
      return;
    }
    this.setRunTexture();
    if (dx !== 0) {
      this.setFacingLeft(dx < 0);
    }
    let vx = 0;
    let vy = 0;
    if (this.action?.dy === 0) {
      this.mole.y = y;
      if (Math.abs(dx) > 1) {
        vx = Math.sign(dx) * this.speed;
      }
      this.mole.body?.setVelocity(vx, 0);
      return;
    }
    if (this.action?.dx === 0) {
      this.mole.x = x;
      if (Math.abs(dy) > 1) {
        vy = Math.sign(dy) * this.speed;
      }
      this.mole.body?.setVelocity(0, vy);
      return;
    }
    if (Math.abs(dx) > 1 && Math.abs(dy) <= 1) {
      vx = Math.sign(dx) * this.speed;
    } else if (Math.abs(dy) > 1 && Math.abs(dx) <= 1) {
      vy = Math.sign(dy) * this.speed;
    } else if (Math.abs(dx) >= Math.abs(dy)) {
      vx = Math.sign(dx) * this.speed;
    } else {
      vy = Math.sign(dy) * this.speed;
    }
    this.mole.body?.setVelocity(vx, vy);
  }

  finishAction(now, goRoam) {
    this.mole.body?.setVelocity(0, 0);
    this.action = null;
    this.stepTarget = null;
    if (goRoam) {
      this.mode = "roam";
      return;
    }
    this.mode = "pause";
    this.pauseUntil = now + this.pauseMs;
    this.lookCount = 0;
    this.nextLookAt = now;
  }

  handleRoam(now) {
    if (!this.roamDir) this.roamDir = Phaser.Math.RND.pick([-1, 1]);
    if (this.stepTarget) {
      this.moveToTarget(now);
      return;
    }
    this.setRunTexture();
    this.setFacingLeft(this.roamDir < 0);

    const blocked = this.handleHorizontalObstacle(this.roamDir, true);
    if (blocked === "turn") {
      this.roamDir *= -1;
      return;
    }
    if (blocked === "dig") {
      return;
    }
    this.mole.body?.setVelocity(this.roamDir * this.speed, 0);
  }

  handleHorizontalObstacle(dir, allowDig) {
    const { col, row } = this.getTilePosition();
    const nextCol = col + dir;
    if (!this.isInBounds(nextCol, row)) return "turn";
    const block = this.blockMap?.get(`${nextCol},${row}`);
    if (!block) return null;
    if (this.isEarthBlock(block)) {
      if (!allowDig) return "turn";
      const didDig = this.onDig?.(nextCol, row);
      if (didDig) this.playDigAnimation();
      this.stepTarget = this.tileToTarget(nextCol, row);
      return "dig";
    }
    return "turn";
  }

  tryAttack(now) {
    if (now - this.lastAttackAt < this.attackCooldownMs) {
      this.mole.body?.setVelocity(0, 0);
      return;
    }
    this.lastAttackAt = now;
    this.mole.body?.setVelocity(0, 0);
    if (this.chargeMs > 0) {
      this.pendingAttack = true;
      this.chargeUntil = now + this.chargeMs;
      this.playChargeAnimation();
      this.onCharge?.();
      return;
    }
    this.executeAttack(now);
  }

  executeAttack(now) {
    this.playAttackAnimation();
    this.onAttack?.();
    this.onStrike?.();
    this.attackPauseUntil = now + this.attackHoldMs;
  }

  playChargeAnimation() {
    this.mole.setTexture(this.chargeTexture);
    this.attackAnimUntil = this.chargeUntil;
  }

  playAttackAnimation() {
    this.mole.setTexture(this.attackTexture);
    this.attackAnimUntil = this.scene.time.now + this.attackHoldMs;
  }

  playDigAnimation() {
    this.mole.setTexture(this.attackTexture);
    this.attackAnimUntil = this.scene.time.now + this.attackHoldMs;
    if (this.digSoundKey) {
      this.scene.sound?.play?.(this.digSoundKey);
    }
  }

  updateAttackAnimation(now) {
    if (this.attackAnimUntil && now >= this.attackAnimUntil) {
      this.attackAnimUntil = 0;
      if (this.mole?.active) {
        this.mole.setTexture(this.runTexture);
      }
    }
  }

  updateCharge(now) {
    if (!this.pendingAttack) return;
    if (now < this.chargeUntil) return;
    this.pendingAttack = false;
    this.chargeUntil = 0;
    this.executeAttack(now);
  }

  setRunTexture() {
    if (this.mole.texture?.key !== this.runTexture) {
      this.mole.setTexture(this.runTexture);
    }
  }

  setFacingLeft(isLeft) {
    const flipX = this.mirrorX ? !isLeft : isLeft;
    this.mole.setFlipX(flipX);
    this.mole.setData("facingDir", isLeft ? -1 : 1);
  }

  tileToTarget(col, row) {
    return {
      x: (col + 0.5) * this.tileSize,
      y: (row + 1) * this.tileSize,
    };
  }

  isEarthBlock(block) {
    return block?.getData("type") === "earth";
  }

  isInBounds(col, row) {
    return col >= 0 && row >= 0 && col < this.scene.gridCols && row < this.scene.gridRows;
  }

  getTilePosition() {
    const col = Math.floor(this.mole.x / this.tileSize);
    const row = Math.floor((this.mole.y - 1) / this.tileSize);
    return { col, row };
  }

  checkStuck(now) {
    const velocity = this.mole.body?.velocity;
    const moving = velocity && (Math.abs(velocity.x) > 1 || Math.abs(velocity.y) > 1);
    const dist = Phaser.Math.Distance.Between(this.mole.x, this.mole.y, this.lastPos.x, this.lastPos.y);
    if (moving && dist < 0.5) {
      if (!this.stuckSince) {
        this.stuckSince = now;
      } else if (now - this.stuckSince > 500) {
        this.action = null;
        this.stepTarget = null;
        this.mode = "idle";
        this.roamDir *= -1;
        this.stuckSince = null;
      }
    } else {
      this.stuckSince = null;
    }
    this.lastPos.set(this.mole.x, this.mole.y);
  }

  logStatus() {
    const action = this.action
      ? `${this.action.type}:${this.action.dx},${this.action.dy}:${this.action.stepsRemaining}`
      : "none";
    const target = this.stepTarget
      ? `${Math.round(this.stepTarget.x)},${Math.round(this.stepTarget.y)}`
      : "none";
    const next = `[Mole] mode=${this.mode} action=${action} target=${target}`;
    if (next !== this.status) {
      this.status = next;
      console.log(next);
    }
  }
}
