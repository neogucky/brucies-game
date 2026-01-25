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
    this.optionsIndex = 0;
    if (!this.container || !this.container.scene || this.container.destroyed) {
      this.container = null;
      this.createUI(position);
    } else {
      this.setPosition(position);
      this.container.setVisible(true);
    }
    this.renderPage();
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
    this.container = this.scene.add.container(0, 0).setDepth(40);
    const shade = this.scene.add.rectangle(480, y, 760, 150, 0x1e150c, 0.7);
    shade.setStrokeStyle(2, 0x8a6b44);
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
    this.container.add([
      shade,
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
    if (this.portraitImage && this.portraitFrame) {
      if (this.portraitKey && this.scene.textures.exists(this.portraitKey)) {
        this.portraitImage.setTexture(this.portraitKey);
        this.applyPortraitScale();
        this.portraitImage.setVisible(true);
        this.portraitFrame.setVisible(true);
      } else {
        this.portraitImage.setVisible(false);
        this.portraitFrame.setVisible(false);
      }
    }
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
      this.hint.setText("Leertaste zum Weiterblättern");
      const handler = () => this.nextPage();
      this.scene.input.keyboard.once("keydown-SPACE", handler);
      this.keyHandlers.push({ key: "SPACE", handler });
    }
  }

  applyPortraitScale() {
    if (!this.portraitImage?.texture?.getSourceImage) return;
    const source = this.portraitImage.texture.getSourceImage();
    if (!source?.width || !source?.height) return;
    const target = 120;
    const scale = Math.min(target / source.width, target / source.height);
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
