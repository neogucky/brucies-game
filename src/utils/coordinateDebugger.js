export default class CoordinateDebugger {
  constructor(scene) {
    this.scene = scene;
    this.enabled = false;
    this.prevState = null;
    this.text = null;
    this.textBg = null;
    this.dragStart = null;
    this.dragGraphic = null;

    this.handleToggle = () => this.toggle();
    this.handlePointerDown = (pointer) => this.onPointerDown(pointer);
    this.handlePointerMove = (pointer) => this.onPointerMove(pointer);
    this.handlePointerUp = (pointer) => this.onPointerUp(pointer);

    scene.input.keyboard.on("keydown-TWO", this.handleToggle);
    scene.events.once("shutdown", () => this.destroy());
  }

  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.prevState = {
      timePaused: this.scene.time?.paused ?? false,
      physicsPaused: this.scene.physics?.world?.isPaused ?? false,
      isPaused: this.scene.isPaused,
    };

    if (this.scene.time) this.scene.time.paused = true;
    if (this.scene.physics?.world) this.scene.physics.world.pause();
    if (typeof this.scene.isPaused === "boolean") {
      this.scene.isPaused = true;
    }

    const bgWidth = 520;
    const bgHeight = 56;
    this.textBg = this.scene.add
      .rectangle(480, 560, bgWidth, bgHeight, 0x20160e, 0.75)
      .setDepth(1000);
    this.text = this.scene.add
      .text(480, 560, "Klick = Position, Ziehen = Rechteck", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(1001)
      .setStroke("#3b2a17", 2);

    this.dragGraphic = this.scene.add.graphics().setDepth(999);
    this.scene.input.on("pointerdown", this.handlePointerDown);
    this.scene.input.on("pointermove", this.handlePointerMove);
    this.scene.input.on("pointerup", this.handlePointerUp);
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    this.scene.input.off("pointerdown", this.handlePointerDown);
    this.scene.input.off("pointermove", this.handlePointerMove);
    this.scene.input.off("pointerup", this.handlePointerUp);
    if (this.text) {
      this.text.destroy();
      this.text = null;
    }
    if (this.textBg) {
      this.textBg.destroy();
      this.textBg = null;
    }
    if (this.dragGraphic) {
      this.dragGraphic.clear();
      this.dragGraphic.destroy();
      this.dragGraphic = null;
    }
    this.dragStart = null;

    if (this.prevState) {
      if (this.scene.time) this.scene.time.paused = this.prevState.timePaused;
      if (this.scene.physics?.world) {
        if (this.prevState.physicsPaused) {
          this.scene.physics.world.pause();
        } else {
          this.scene.physics.world.resume();
        }
      }
      if (typeof this.scene.isPaused === "boolean") {
        this.scene.isPaused = this.prevState.isPaused;
      }
      this.prevState = null;
    }
  }

  onPointerDown(pointer) {
    if (!this.enabled) return;
    this.dragStart = { x: pointer.worldX, y: pointer.worldY };
  }

  onPointerMove(pointer) {
    if (!this.enabled || !this.dragStart || !pointer.isDown) return;
    const x1 = this.dragStart.x;
    const y1 = this.dragStart.y;
    const x2 = pointer.worldX;
    const y2 = pointer.worldY;
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    if (this.dragGraphic) {
      this.dragGraphic.clear();
      this.dragGraphic.lineStyle(2, 0xffffff, 0.8);
      this.dragGraphic.strokeRect(left, top, width, height);
    }
  }

  onPointerUp(pointer) {
    if (!this.enabled || !this.dragStart) return;
    const x1 = this.dragStart.x;
    const y1 = this.dragStart.y;
    const x2 = pointer.worldX;
    const y2 = pointer.worldY;
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    this.dragStart = null;
    if (this.dragGraphic) {
      this.dragGraphic.clear();
    }
    if (dx < 4 && dy < 4) {
      const x = Math.round(x2);
      const y = Math.round(y2);
      const message = `Pos: ${x}, ${y}`;
      if (this.text) this.text.setText(message);
      console.log(message);
      return;
    }
    const left = Math.round(Math.min(x1, x2));
    const top = Math.round(Math.min(y1, y2));
    const right = Math.round(Math.max(x1, x2));
    const bottom = Math.round(Math.max(y1, y2));
    const width = Math.round(Math.abs(x2 - x1));
    const height = Math.round(Math.abs(y2 - y1));
    const message = `Rect: TL(${left},${top}) Size(${width},${height}) BR(${right},${bottom})`;
    if (this.text) this.text.setText(message);
    console.log(message);
  }

  destroy() {
    this.scene.input.keyboard.off("keydown-TWO", this.handleToggle);
    this.scene.input.off("pointerdown", this.handlePointerDown);
    this.scene.input.off("pointermove", this.handlePointerMove);
    this.scene.input.off("pointerup", this.handlePointerUp);
    if (this.text) {
      this.text.destroy();
      this.text = null;
    }
    if (this.textBg) {
      this.textBg.destroy();
      this.textBg = null;
    }
    if (this.dragGraphic) {
      this.dragGraphic.clear();
      this.dragGraphic.destroy();
      this.dragGraphic = null;
    }
  }
}
