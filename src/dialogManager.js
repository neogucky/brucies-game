export default class DialogManager {
  constructor(scene) {
    this.scene = scene;
    this.container = null;
    this.text = null;
    this.hint = null;
    this.pages = [];
    this.index = 0;
    this.keyHandlers = [];
  }

  show(pages, position = "middle", options = {}) {
    this.pages = pages;
    this.index = 0;
    this.onClose = options.onClose || null;
    this.portraitKey = options.portraitKey || null;
    this.portraitZoom = Number.isFinite(options.portraitZoom) ? options.portraitZoom : 1;
    this.optionsIndex = 0;
    if (!this.container || !this.container.scene || this.container.destroyed) {
      this.container = null;
      this.createUI(position);
    } else {
      this.setPosition(position);
      this.container.setVisible(true);
    }
    this.renderPage(); this.container.setScrollFactor(0); this.container.list.forEach(child => child.setScrollFactor(0));
  }

  hide() {
    if (this.container) {
      this.container.setVisible(false);
    }
    this.clearHandlers();
    if (this.onClose) {
      this.onClose();
      this.onClose = null;
    }
  }

  createUI(position) {
    const y = this.getY(position);
    this.container = this.scene.add.container(0, 0).setDepth(800).setScrollFactor(0);
    this.modalShade = this.scene.add.rectangle(480, 300, 960, 600, 0x08150e, .28).setInteractive();
    const shade = this.scene.add.rectangle(480, y, 760, 150, 0x1e150c, 0.7);
    shade.setStrokeStyle(2, 0xc4a76e).setInteractive().on("pointerdown", () => {
      if (!this.pages[this.index]?.options?.length) this.nextPage();
    });
    this.portraitFrame = this.scene.add.circle(120, y - 80, 78, 0xe2c18b, 0.95);
    this.portraitFrame.setStrokeStyle(4, 0x8a6b44);
    const portraitMask = this.scene.add.circle(120, y - 80, 78, 0xffffff, 1);
    this.portraitImage = this.scene.add.image(120, y - 80, "ui-coin");
    this.portraitMask = portraitMask;
    this.portraitImage.setMask(portraitMask.createGeometryMask());
    portraitMask.setVisible(false);
    this.portraitImage.setVisible(false);
    this.text = this.scene.add
      .text(480, y - 18, "", {
        fontFamily: "Georgia, serif",
        fontSize: "20px",
        color: "#f7edd6",
        align: "center",
        wordWrap: { width: 700 },
      })
      .setOrigin(0.5);
    this.hint = this.scene.add
      .text(480, y + 40, "", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "14px",
        color: "#e7d7b6",
        align: "center",
      })
      .setOrigin(0.5);
    this.hint.setInteractive({ useHandCursor: true }).on("pointerdown", pointer => {
      const options = this.pages[this.index]?.options;
      if (!options?.length) { this.nextPage(); return; }
      const bounds = this.hint.getBounds();
      this.optionsIndex = Math.max(0, Math.min(options.length - 1, Math.floor((pointer.y - bounds.y) / (bounds.height / options.length))));
      this.selectOption(options);
    });
    this.container.add([
      this.modalShade, shade,
      this.portraitFrame,
      this.portraitImage,
      portraitMask,
      this.text,
      this.hint,
    ]);
  }

  setPosition(position) {
    const y = this.getY(position);
    this.container.list.forEach((child) => {
      if (child === this.modalShade) return;
      if (child === this.text) {
        child.y = y - 18;
      } else if (child === this.hint) {
        child.y = y + 40;
      } else if (
        child === this.portraitFrame ||
        child === this.portraitImage ||
        child === this.portraitMask
      ) {
        child.y = y - 80;
      } else {
        child.y = y;
      }
    });
  }

  getY(position) {
    if (position === "top") return 140;
    if (position === "bottom") return 460;
    return 300;
  }

  renderPage() {
    this.clearHandlers();
    const page = this.pages[this.index];
    if (!page) return;
    const hasPortrait = Boolean(this.portraitKey && this.scene.textures.exists(this.portraitKey));
    if (this.portraitImage && this.portraitFrame) {
      if (hasPortrait) {
        this.portraitImage.setTexture(this.portraitKey);
        this.applyPortraitScale();
        this.portraitImage.setVisible(true);
        this.portraitFrame.setVisible(true);
      } else {
        this.portraitImage.setVisible(false);
        this.portraitFrame.setVisible(false);
      }
    }
    // Reserve the portrait's full diameter plus a gap, including on reused
    // dialogs that switch between portrait and text-only pages.
    this.text.setStyle({ wordWrap: { width: hasPortrait ? 600 : 700 }, align: hasPortrait ? 'left' : 'center' })
      .setOrigin(hasPortrait ? 0 : .5, .5).setX(hasPortrait ? 230 : 480);
    this.hint.setX(hasPortrait ? 530 : 480);
    this.text.setText(page.text);
    if (page.options && page.options.length > 0) {
      this.optionsIndex = Math.min(this.optionsIndex, page.options.length - 1);
      this.renderOptions(page.options);
      const handleUp = () => this.moveOption(-1, page.options);
      const handleDown = () => this.moveOption(1, page.options);
      const handleEnter = () => this.selectOption(page.options);
      this.scene.input.keyboard.on("keydown-UP", handleUp);
      this.scene.input.keyboard.on("keydown-DOWN", handleDown);
      this.scene.input.keyboard.on("keydown-ENTER", handleEnter);
      this.keyHandlers.push({ key: "UP", handler: handleUp });
      this.keyHandlers.push({ key: "DOWN", handler: handleDown });
      this.keyHandlers.push({ key: "ENTER", handler: handleEnter });
    } else {
      this.hint.setText("Weiter · {confirm}");
      const handler = () => this.nextPage();
      this.scene.input.keyboard.once("keydown-ENTER", handler);
      this.keyHandlers.push({ key: "ENTER", handler });
    }
  }

  applyPortraitScale() {
    if (!this.portraitImage?.texture?.getSourceImage) return;
    const source = this.portraitImage.texture.getSourceImage();
    if (!source?.width || !source?.height) return;
    const target = 120;
    const scale = Math.min(target / source.width, target / source.height) * this.portraitZoom;
    this.portraitImage.setScale(scale);
  }

  renderOptions(options) {
    const lines = options.map((opt, index) => {
      const prefix = index === this.optionsIndex ? ">" : " ";
      return `${prefix} ${opt.label}`;
    });
    this.hint.setText(lines.join("\n"));
  }

  moveOption(delta, options) {
    if (!options || options.length === 0) return;
    this.optionsIndex = Phaser.Math.Wrap(this.optionsIndex + delta, 0, options.length);
    this.renderOptions(options);
  }

  selectOption(options) {
    const opt = options[this.optionsIndex];
    if (!opt) return;
    if (opt.action) opt.action();
    if (!opt.keepOpen) {
      this.hide();
    }
  }

  nextPage() {
    if (this.index < this.pages.length - 1) {
      this.index += 1;
      this.renderPage();
    } else {
      this.hide();
    }
  }

  clearHandlers() {
    this.keyHandlers.forEach(({ key, handler }) => {
      this.scene.input.keyboard.off(`keydown-${key}`, handler);
    });
    this.keyHandlers = [];
  }
}
