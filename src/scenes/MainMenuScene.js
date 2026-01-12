import { clearSave, defaultSave, saveProgress } from "../saveManager.js";

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainMenuScene" });
    this.menuItems = [];
    this.selectedIndex = 0;
  }

  create() {
    this.addBackground();
    this.addTitle();
    this.addMenu();
    this.addHelperText();
    this.updateSelection();

    this.input.keyboard.on("keydown-UP", () => this.moveSelection(-1));
    this.input.keyboard.on("keydown-DOWN", () => this.moveSelection(1));
    this.input.keyboard.on("keydown-ENTER", () => this.activateSelection());
  }

  addBackground() {
    this.add.rectangle(480, 300, 960, 600, 0x1f1a12).setAlpha(0.95);
    this.add.rectangle(480, 160, 760, 200, 0x4d3a26).setAlpha(0.8);
  }

  addTitle() {
    this.add
      .text(480, 110, "Ritter & Begleiter", {
        fontFamily: "Georgia, serif",
        fontSize: "48px",
        color: "#f6e1b9",
      })
      .setOrigin(0.5);

    this.add
      .text(480, 165, "Ein Abenteuer in vielen Minispielen", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "20px",
        color: "#dfc49a",
      })
      .setOrigin(0.5);
  }

  addMenu() {
    const menuData = [
      {
        label: "Neues Spiel",
        action: () => this.startNewGame(),
      },
      {
        label: "Spielstand laden",
        action: () => this.loadGame(),
      },
    ];

    menuData.forEach((item, index) => {
      const text = this.add
        .text(480, 280 + index * 50, item.label, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "28px",
          color: "#d2c1a2",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          this.selectedIndex = index;
          this.updateSelection();
        })
        .on("pointerdown", () => item.action());

      this.menuItems.push({ text, action: item.action });
    });
  }

  addHelperText() {
    this.add
      .text(480, 520, "Pfeile / Maus zum Navigieren, Enter zum Start", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#a8916f",
      })
      .setOrigin(0.5);
  }

  moveSelection(delta) {
    const nextIndex = Phaser.Math.Wrap(
      this.selectedIndex + delta,
      0,
      this.menuItems.length
    );
    this.selectedIndex = nextIndex;
    this.updateSelection();
  }

  updateSelection() {
    this.menuItems.forEach((item, index) => {
      const isSelected = index === this.selectedIndex;
      item.text.setColor(isSelected ? "#f6e1b9" : "#d2c1a2");
      item.text.setScale(isSelected ? 1.08 : 1);
    });
  }

  activateSelection() {
    const item = this.menuItems[this.selectedIndex];
    if (item) {
      item.action();
    }
  }

  startNewGame() {
    clearSave();
    const saveData = { ...defaultSave };
    this.registry.set("saveData", saveData);
    saveProgress(saveData);
    this.scene.start("LevelSelectScene");
  }

  loadGame() {
    this.scene.start("LevelSelectScene");
  }
}
