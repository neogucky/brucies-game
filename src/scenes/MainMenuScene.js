import { showConfirmation } from "../ui/ConfirmationDialog.js";
import { clearSave, defaultSave, saveProgress, normalizeWorldProgress } from "../saveManager.js";
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
    this.menuItems = [];
    this.isDialogOpen = false;
    const saveData = this.registry.get("saveData");
    this.hasSave = Boolean(saveData && saveData.lastPlayed);
    this.selectedIndex = this.hasSave ? 0 : 1;
    this.addBackground();
    this.addTitle();
    this.addMenu();
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
      {
        label: 'Intro ansehen',
        action: () => this.scene.start('IntroScene', { returnScene: 'MainMenuScene' }),
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
    const controlProfile = this.registry.get("saveData")?.settings?.controlProfile || defaultSave.settings.controlProfile;
    clearSave();
    const saveData = { ...defaultSave, settings: { ...defaultSave.settings, controlProfile } };
    this.registry.set("saveData", saveData);
    saveProgress(saveData);
    this.scene.start("CharacterSelectScene");
  }

  loadGame() {
    const rawSave = this.registry.get("saveData");
    const saveData = rawSave ? normalizeWorldProgress(rawSave) : null;
    if (saveData) {
      const nextSave = {
        ...saveData,
        health: 5,
      };
      this.registry.set("saveData", nextSave);
      saveProgress(nextSave);
    }
    if (saveData?.currentWorld === "jungle") {
      this.scene.start("JungleMapScene");
      return;
    }
    if (saveData?.currentWorld === "underground") {
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
      "Alten Spielstand überschreiben?",
      () => this.startNewGame()
    );
  }

  openConfirmDialog(message, onYes) { return showConfirmation(this, message, onYes, { pause: false }); }

  createSettingsDialog() {
    this.settingsBox = this.add.container(0, 0).setDepth(800).setVisible(false);
    const shade = this.add.rectangle(480, 300, 960, 600, 0x08140e, .75).setInteractive();
    const panel = this.add.rectangle(480, 300, 580, 290, 0x253f2e).setStrokeStyle(3, 0xc6ab6c);
    this.settingsText = this.add.text(480, 260, '', { fontFamily: 'Georgia, serif', fontSize: '25px', color: '#fff1c5' })
      .setOrigin(.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.settingsIndex = 0; this.settingsActions.confirm(); });
    this.settingsSave = this.add.text(480, 330, 'Speichern', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '23px', color: '#fff1c5', backgroundColor: '#526445', padding: { x: 30, y: 12 } })
      .setOrigin(.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.settingsIndex = 1; this.settingsActions.confirm(); });
    this.settingsHint = this.add.text(480, 405, 'Auswählen: ↑/↓ · Bestätigen · {confirm} · Abbrechen · {back}', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '15px', color: '#cfddb6',
    }).setOrigin(.5);
    this.settingsBox.add([shade, panel, this.settingsText, this.settingsSave, this.settingsHint]);
  }

  openSettingsDialog() {
    if (this.isDialogOpen) return;
    this.isDialogOpen = true; this.settingsIndex = 0;
    const save = this.registry.get('saveData') || {};
    this.pendingSettings = { autoAim: Boolean(save.settings?.autoAim) };
    const close = saveChanges => {
      if (saveChanges) this.applySettings();
      this.settingsBox.setVisible(false); this.settingsActions = null; this.isDialogOpen = false; this.pendingSettings = null;
    };
    this.settingsActions = {
      up: () => { this.settingsIndex = 0; this.updateSettingsText(); },
      down: () => { this.settingsIndex = 1; this.updateSettingsText(); },
      confirm: () => {
        if (this.settingsIndex === 1) { close(true); return; }
        this.pendingSettings.autoAim = !this.pendingSettings.autoAim; this.updateSettingsText();
      },
      back: () => close(false),
    };
    this.updateSettingsText(); this.settingsBox.setVisible(true);
  }

  updateSettingsText() {
    this.settingsText.setText('Auto-Anvisieren: ' + (this.pendingSettings?.autoAim ? 'An' : 'Aus'));
    this.settingsText.setColor(this.settingsIndex === 0 ? '#ffe0a0' : '#bdd0b0');
    this.settingsSave.setColor(this.settingsIndex === 1 ? '#ffe0a0' : '#bdd0b0');
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
