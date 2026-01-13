import { clearSave, defaultSave, saveProgress } from "../saveManager.js";

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainMenuScene" });
    this.menuItems = [];
    this.selectedIndex = 0;
    this.hasSave = false;
  }

  create() {
    const saveData = this.registry.get("saveData");
    this.hasSave = Boolean(saveData && saveData.lastPlayed);
    this.selectedIndex = this.hasSave ? 0 : 1;
    this.addBackground();
    this.addTitle();
    this.addMenu();
    this.addHelperText();
    this.createConfirmDialog();
    this.updateSelection();

    this.input.keyboard.on("keydown-UP", () => this.moveSelection(-1));
    this.input.keyboard.on("keydown-DOWN", () => this.moveSelection(1));
    this.input.keyboard.on("keydown-ENTER", () => this.activateSelection());
  }

  addBackground() {
    const bg = this.add.image(480, 300, "menu-bg");
    const scale = Math.max(960 / bg.width, 600 / bg.height);
    bg.setScale(scale);
  }

  addTitle() {
    this.add
      .text(480, 110, "Ritter & Begleiter", {
        fontFamily: "Georgia, serif",
        fontSize: "48px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setStroke("#433320", 5);

    this.add
      .text(480, 165, "Ein Abenteuer in vielen Minispielen", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setStroke("#433320", 3);
  }

  addMenu() {
    const menuData = [
      {
        label: "Weiterspielen",
        action: () => this.loadGame(),
        enabled: this.hasSave,
      },
      {
        label: "Neues Spiel",
        action: () => this.requestNewGame(this.hasSave),
        enabled: true,
      },
    ];

    menuData.forEach((item, index) => {
      const text = this.add
        .text(480, 280 + index * 50, item.label, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "28px",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setStroke("#433320", 3)
        .setAlpha(item.enabled ? 1 : 0.4)
        .setInteractive({ useHandCursor: item.enabled })
        .on("pointerover", () => {
          if (!item.enabled) return;
          this.selectedIndex = index;
          this.updateSelection();
        })
        .on("pointerdown", () => {
          if (item.enabled) {
            item.action();
          }
        });

      this.menuItems.push({ text, action: item.action, enabled: item.enabled });
    });
  }

  addHelperText() {
    this.add
      .text(480, 540, "Pfeile / Maus zum Navigieren, Enter zum Start", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setStroke("#433320", 2);
  }

  moveSelection(delta) {
    const nextIndex = Phaser.Math.Wrap(
      this.selectedIndex + delta,
      0,
      this.menuItems.length
    );
    const startIndex = nextIndex;
    let cursor = nextIndex;
    while (!this.menuItems[cursor].enabled) {
      cursor = Phaser.Math.Wrap(cursor + delta, 0, this.menuItems.length);
      if (cursor === startIndex) return;
    }
    this.selectedIndex = cursor;
    this.updateSelection();
  }

  updateSelection() {
    this.menuItems.forEach((item, index) => {
      const isSelected = index === this.selectedIndex;
      const baseColor = item.enabled ? "#ffffff" : "#b9b9b9";
      item.text.setColor(isSelected ? "#fff4ea" : baseColor);
      item.text.setScale(isSelected && item.enabled ? 1.08 : 1);
    });
  }

  activateSelection() {
    const item = this.menuItems[this.selectedIndex];
    if (item) {
      if (item.enabled) {
        item.action();
      }
    }
  }

  startNewGame() {
    clearSave();
    const saveData = { ...defaultSave };
    this.registry.set("saveData", saveData);
    saveProgress(saveData);
    this.scene.start("WorldMapScene");
  }

  loadGame() {
    const saveData = this.registry.get("saveData");
    if (saveData) {
      const nextSave = {
        ...saveData,
        health: 5,
      };
      this.registry.set("saveData", nextSave);
      saveProgress(nextSave);
    }
    this.scene.start("WorldMapScene");
  }

  requestNewGame(hasSave) {
    if (!hasSave) {
      this.startNewGame();
      return;
    }
    this.openConfirmDialog(
      "Alten Spielstand überschreiben?\n[J]a oder [N]ein",
      () => this.startNewGame()
    );
  }

  createConfirmDialog() {
    this.confirmBox = this.add.container(0, 0).setDepth(20).setVisible(false);
    const shade = this.add.rectangle(480, 300, 960, 600, 0x000000, 0.45);
    const panel = this.add.rectangle(480, 300, 520, 160, 0xe2c18b).setStrokeStyle(3, 0x8a6b44);
    this.confirmText = this.add
      .text(480, 300, "", {
        fontFamily: "Georgia, serif",
        fontSize: "22px",
        color: "#3b2a17",
        align: "center",
      })
      .setOrigin(0.5);
    this.confirmBox.add([shade, panel, this.confirmText]);
  }

  openConfirmDialog(message, onYes) {
    this.confirmText.setText(message);
    this.confirmBox.setVisible(true);
    const close = () => {
      this.confirmBox.setVisible(false);
      this.input.keyboard.off("keydown-J", yesHandler);
      this.input.keyboard.off("keydown-N", noHandler);
    };
    const yesHandler = () => {
      close();
      onYes();
    };
    const noHandler = () => close();
    this.input.keyboard.once("keydown-J", yesHandler);
    this.input.keyboard.once("keydown-N", noHandler);
  }
}
