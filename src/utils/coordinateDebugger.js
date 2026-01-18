export default class CoordinateDebugger {
  constructor(scene) {
    this.scene = scene;
    this.enabled = false;
    this.prevState = null;
    this.text = null;

    this.handleToggle = () => this.toggle();
    this.handlePointer = (pointer) => this.onPointer(pointer);

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

    this.text = this.scene.add
      .text(20, 20, "Koordinaten: Klick auf die Karte", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "14px",
        color: "#ffffff",
      })
      .setDepth(1000)
      .setStroke("#3b2a17", 2);

    this.scene.input.on("pointerdown", this.handlePointer);
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    this.scene.input.off("pointerdown", this.handlePointer);
    if (this.text) {
      this.text.destroy();
      this.text = null;
    }

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

  onPointer(pointer) {
    if (!this.enabled) return;
    const x = Math.round(pointer.worldX);
    const y = Math.round(pointer.worldY);
    const message = `Koordinaten: ${x}, ${y}`;
    if (this.text) this.text.setText(message);
    // Useful for copy/paste.
    console.log(message);
  }

  destroy() {
    this.scene.input.keyboard.off("keydown-TWO", this.handleToggle);
    this.scene.input.off("pointerdown", this.handlePointer);
    if (this.text) {
      this.text.destroy();
      this.text = null;
    }
  }
}
