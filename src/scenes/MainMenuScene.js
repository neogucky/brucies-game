import { clearSave, defaultSave, saveProgress } from "../saveManager.js";
import { playMusic } from "../soundManager.js";

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainMenuScene" });
    this.menuItems = [];
    this.selectedIndex = 0;
    this.hasSave = false;
    this.isDialogOpen = false;
    this.settingsIndex = 0;
    this.pendingSettings = null;
  }

  create() {
    const saveData = this.registry.get("saveData");
    this.hasSave = Boolean(saveData && saveData.lastPlayed);
    this.selectedIndex = this.hasSave ? 0 : 1;
    this.addBackground();
    this.addTitle();
    this.addMenu();
    this.createConfirmDialog();
    this.createSettingsDialog();
    this.updateSelection();
    playMusic(this, "music-menu");

    this.input.keyboard.on("keydown-UP", () => this.moveSelection(-1));
    this.input.keyboard.on("keydown-DOWN", () => this.moveSelection(1));
    this.input.keyboard.on("keydown-ENTER", () => this.activateSelection());
    this.input.keyboard.on("keydown-F", () => this.toggleFullscreen());
  }

  addBackground() {
    const bg = this.add.image(480, 300, "menu-bg");
    const scale = Math.max(960 / bg.width, 600 / bg.height);
    bg.setScale(scale);
  }

  addTitle() {
    this.add
      .text(480, 90, "Ritter und sein gelber Begleiter", {
        fontFamily: "Georgia, serif",
        fontSize: "50px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setStroke("#433320", 7);
    
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
      {
        label: "Einstellungen",
        action: () => this.openSettingsDialog(),
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
  
  moveSelection(delta) {
    if (this.isDialogOpen) return;
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
      item.text.setScale(isSelected && item.enabled ? 1.08 : 1);
      item.text.setStroke("#433320", isSelected ? 5 : 3);
    });
  }

  activateSelection() {
    if (this.isDialogOpen) return;
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
    this.scene.start("CharacterSelectScene");
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
    if (saveData?.currentLevel === "UnderShop" || saveData?.currentLevel === "UnderDig") {
      this.scene.start("UndergroundMapScene");
      return;
    }
    this.scene.start("DessertMapScene");
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
    this.isDialogOpen = true;
    this.confirmText.setText(message);
    this.confirmBox.setVisible(true);
    const close = () => {
      this.confirmBox.setVisible(false);
      this.input.keyboard.off("keydown-J", yesHandler);
      this.input.keyboard.off("keydown-N", noHandler);
      this.isDialogOpen = false;
    };
    const yesHandler = () => {
      close();
      onYes();
    };
    const noHandler = () => close();
    this.input.keyboard.once("keydown-J", yesHandler);
    this.input.keyboard.once("keydown-N", noHandler);
  }

  createSettingsDialog() {
    this.settingsBox = this.add.container(0, 0).setDepth(20).setVisible(false);
    const shade = this.add.rectangle(480, 300, 960, 600, 0x000000, 0.45);
    const panel = this.add.rectangle(480, 300, 520, 190, 0xe2c18b).setStrokeStyle(3, 0x8a6b44);
    this.settingsText = this.add
      .text(480, 290, "", {
        fontFamily: "Georgia, serif",
        fontSize: "22px",
        color: "#3b2a17",
        align: "center",
      })
      .setOrigin(0.5);
    this.settingsHint = this.add
      .text(480, 350, "Enter = Umschalten, S = Speichern und zurück, Esc = Abbrechen", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "14px",
        color: "#4b3824",
      })
      .setOrigin(0.5);
    this.settingsBox.add([shade, panel, this.settingsText, this.settingsHint]);
  }

  openSettingsDialog() {
    if (this.isDialogOpen) return;
    this.isDialogOpen = true;
    this.settingsIndex = 0;
    const saveData = this.registry.get("saveData") || {};
    this.pendingSettings = {
      autoAim: Boolean(saveData.settings?.autoAim),
    };
    this.updateSettingsText();
    this.settingsBox.setVisible(true);

    const close = (saveChanges) => {
      this.settingsBox.setVisible(false);
      this.input.keyboard.off("keydown-ENTER", toggleHandler);
      this.input.keyboard.off("keydown-SPACE", toggleHandler);
      this.input.keyboard.off("keydown-UP", upHandler);
      this.input.keyboard.off("keydown-DOWN", downHandler);
      this.input.keyboard.off("keydown-S", saveHandler);
      this.input.keyboard.off("keydown-ESC", cancelHandler);
      this.isDialogOpen = false;
      if (saveChanges) {
        this.applySettings();
      }
      this.pendingSettings = null;
    };

    const toggleHandler = () => {
      this.pendingSettings.autoAim = !this.pendingSettings.autoAim;
      this.updateSettingsText();
    };

    const saveHandler = () => close(true);
    const cancelHandler = () => close(false);
    const upHandler = () => {
      this.settingsIndex = 0;
      this.updateSettingsText();
    };
    const downHandler = () => {
      this.settingsIndex = 0;
      this.updateSettingsText();
    };

    this.input.keyboard.on("keydown-ENTER", toggleHandler);
    this.input.keyboard.on("keydown-SPACE", toggleHandler);
    this.input.keyboard.on("keydown-UP", upHandler);
    this.input.keyboard.on("keydown-DOWN", downHandler);
    this.input.keyboard.on("keydown-S", saveHandler);
    this.input.keyboard.on("keydown-ESC", cancelHandler);
  }

  updateSettingsText() {
    const autoAim = Boolean(this.pendingSettings?.autoAim);
    const line1 = `${this.settingsIndex === 0 ? ">" : " "} Auto-Anvisieren: ${
      autoAim ? "An" : "Aus"
    }`;
    this.settingsText.setText(line1);
  }

  applySettings() {
    const saveData = this.registry.get("saveData") || {};
    const nextSave = {
      ...saveData,
      settings: {
        ...(saveData.settings || {}),
        ...this.pendingSettings,
      },
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);
  }

  toggleFullscreen() {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    } else {
      this.scale.startFullscreen();
    }
  }
}
