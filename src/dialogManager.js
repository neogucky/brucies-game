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
    if (!this.container) {
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
    this.container.add([shade, this.text, this.hint]);
  }

  setPosition(position) {
    const y = this.getY(position);
    this.container.list.forEach((child) => {
      child.y = y + (child === this.text ? -18 : child === this.hint ? 40 : 0);
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
    this.text.setText(page.text);
    if (page.options && page.options.length > 0) {
      this.hint.setText(page.options.map((opt) => opt.label).join("  "));
      page.options.forEach((opt) => {
        const handler = () => {
          if (opt.onSelect) opt.onSelect();
          if (!opt.keepOpen) {
            this.hide();
          }
        };
        this.scene.input.keyboard.once(`keydown-${opt.key.toUpperCase()}`, handler);
        this.keyHandlers.push({ key: opt.key.toUpperCase(), handler });
      });
    } else {
      this.hint.setText("Leertaste zum Weiterblättern");
      const handler = () => this.nextPage();
      this.scene.input.keyboard.once("keydown-SPACE", handler);
      this.keyHandlers.push({ key: "SPACE", handler });
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
