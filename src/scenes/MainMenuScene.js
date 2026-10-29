import { CONTROL_PROFILES, controlProfileId } from "../utils/controlProfiles.js";
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

  init(data) { this.returnSelection = data?.selectedMenu; }

  create() {
    this.menuItems = [];
    this.leaving = false;
    this.isDialogOpen = false;
    const rawSave = this.registry.get("saveData");
    const saveData = rawSave ? normalizeWorldProgress(rawSave) : null;
    this.hasSave = Boolean(saveData?.lastPlayed);
    this.canContinue = Boolean(this.hasSave && saveData.currentLevel && saveData.unlockedWorlds.includes(saveData.currentWorld));
    this.selectedIndex = this.returnSelection === 'cinema' ? 3 : this.canContinue ? 0 : 1;
    this.addBackground();
    this.addTitle();
    this.addMenu();
    this.createSettingsDialog();
    this.updateSelection();
    playMusic(this, "music-menu", { volume: .35 });

    this.input.keyboard.on("keydown-UP", () => this.moveSelection(-1));
    this.input.keyboard.on("keydown-DOWN", () => this.moveSelection(1));
    this.input.keyboard.on("keydown-LEFT", () => this.moveSelection(-1));
    this.input.keyboard.on("keydown-RIGHT", () => this.moveSelection(1));
    this.input.keyboard.on("keydown-ENTER", () => this.activateSelection());
    this.input.keyboard.on("keydown-F", () => this.toggleFullscreen());
  }

  addBackground() {
    const bg = this.add.image(480, 300, "menu-book");
    const scale = Math.max(960 / bg.width, 600 / bg.height);
    bg.setScale(scale);
  }

  addTitle() {
    const title = this.add.image(705, 172, "menu-book-title");
    title.setScale(350 / title.width);
    title.setName("Der Ritter und sein gelber Begleiter");
  }

  addMenu() {
    const menuData = [
      {
        label: "Weiterspielen",
        action: () => this.loadGame(),
        enabled: this.canContinue,
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
        label: 'Kino',
        action: () => this.scene.start('CinemaScene'),
        enabled: true,
      },
    ];

    this.selectionMark = this.add.graphics();
    menuData.forEach((item, index) => {
      const text = this.add
        .text(716, 289 + index * 58, item.label, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "32px",
          fontStyle: "bold",
          color: "#123f45",
        })
        .setOrigin(0.5)
        .setAlpha(item.enabled ? 1 : 0.4);
      // The complete line of the book is tappable, including beside the label.
      text.setInteractive({
          hitArea: new Phaser.Geom.Rectangle((text.width - 322) / 2, (text.height - 54) / 2, 322, 54),
          hitAreaCallback: Phaser.Geom.Rectangle.Contains,
          useHandCursor: item.enabled,
        })
        .on("pointerover", () => {
          if (!item.enabled || this.isDialogOpen || this.leaving) return;
          this.selectedIndex = index;
          this.updateSelection();
        })
        .on("pointerdown", () => {
          if (!item.enabled || this.isDialogOpen || this.leaving) return;
          this.selectedIndex = index;
          this.updateSelection();
          this.activateSelection();
        });

      this.menuItems.push({ text, action: item.action, enabled: item.enabled });
    });
  }
  
  moveSelection(delta) {
    if (this.isDialogOpen || this.leaving) return;
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
    const y = this.menuItems[this.selectedIndex]?.text.y;
    const mark = this.selectionMark;
    if (mark && Number.isFinite(y)) {
      mark.clear();
      // A slightly uneven ink stroke and a red bookmark belong to the page.
      mark.fillStyle(0x123f45, .97).fillPoints([
        { x: 555, y: y - 23 }, { x: 611, y: y - 25 },
        { x: 839, y: y - 24 }, { x: 875, y: y - 21 },
        { x: 872, y: y - 15 }, { x: 878, y: y - 8 },
        { x: 874, y: y + 16 }, { x: 877, y: y + 22 },
        { x: 812, y: y + 24 }, { x: 604, y: y + 23 },
        { x: 554, y: y + 25 }, { x: 558, y: y + 13 },
        { x: 553, y: y + 7 }, { x: 557, y: y - 13 },
      ], true);
      const ribbon = [
        { x: 568, y: y - 30 }, { x: 590, y: y - 31 },
        { x: 590, y: y + 31 }, { x: 579, y: y + 23 },
        { x: 568, y: y + 32 },
      ];
      mark.fillStyle(0xb83e2d).fillPoints(ribbon, true);
      mark.lineStyle(1.5, 0x7f3025).strokePoints(ribbon, true);
      mark.lineStyle(1, 0xf1a05c, .75).lineBetween(572, y - 25, 572, y + 23);
      mark.fillStyle(0xf0be65).fillCircle(594, y - 17, 2.5);
    }
    this.menuItems.forEach((item, index) => {
      const isSelected = index === this.selectedIndex;
      item.text.setScale(1);
      item.text.setColor?.(isSelected && item.enabled ? "#fff3d0" : "#123f45");
    });
  }

  activateSelection() {
    if (this.isDialogOpen || this.leaving) return;
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
    if (this.leaving) return;
    const rawSave = this.registry.get("saveData");
    const saveData = rawSave ? normalizeWorldProgress(rawSave) : null;
    if (!saveData?.currentLevel || !saveData.unlockedWorlds.includes(saveData.currentWorld)) return;
    this.leaving = true;
    // Continue belongs to gameplay, even after an interrupted cinema playlist.
    this.registry.set('storyPreview', null);
    if (saveData) {
      const nextSave = {
        ...saveData,
        health: 5,
      };
      this.registry.set("saveData", nextSave);
      saveProgress(nextSave);
    }
    if (saveData?.currentWorld === 'water') { this.scene.start('WaterMapScene'); return; }
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
    const textStyle = { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '20px', color: '#fff1c5' };
    this.settingsBox = this.add.container(0, 0).setDepth(800).setVisible(false);
    const shade = this.add.rectangle(480, 300, 960, 600, 0x08140e, .75).setInteractive();
    const panel = this.add.rectangle(480, 300, 680, 410, 0x253f2e).setStrokeStyle(3, 0xc6ab6c);
    const title = this.add.text(480, 138, 'Einstellungen', { ...textStyle, fontFamily: 'Georgia, serif', fontSize: '30px' }).setOrigin(.5);
    this.settingsText = this.add.text(480, 205, '', textStyle).setOrigin(.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { this.settingsIndex = 0; this.settingsActions.confirm(); });
    const profileTitle = this.add.text(480, 259, 'Steuerung', { ...textStyle, fontSize: '18px' }).setOrigin(.5);
    this.profileChoices = Object.entries(CONTROL_PROFILES).map(([id, profile], index) => {
      const button = this.add.text(280 + index * 200, 310, profile.name.replace(' Tastatur', '\nTastatur'), {
        ...textStyle, fontSize: '17px', align: 'center', fixedWidth: 180, fixedHeight: 56,
        backgroundColor: '#344f3b', padding: { top: 8 },
      }).setOrigin(.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.settingsIndex = 1; this.pendingSettings.controlProfile = id; this.updateSettingsText();
      });
      return { id, button };
    });
    const profileHint = this.add.text(480, 354, 'Das Profil wird beim Speichern übernommen.', { ...textStyle, fontSize: '13px', color: '#bdd0b0' }).setOrigin(.5);
    this.settingsSave = this.add.text(620, 410, 'Speichern · {confirm}', { ...textStyle, backgroundColor: '#526445', padding: { x: 18, y: 12 } })
      .setOrigin(.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.settingsIndex = 2; this.settingsActions.confirm(); });
    this.settingsCancel = this.add.text(330, 410, 'Abbrechen · {back}', { ...textStyle, backgroundColor: '#344f3b', padding: { x: 18, y: 12 } })
      .setOrigin(.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.settingsActions.back());
    this.settingsHint = this.add.text(480, 470, '↑/↓: Auswahl · ←/→: Profil · Wählen · {confirm}', {
      ...textStyle, fontSize: '14px', color: '#cfddb6',
    }).setOrigin(.5);
    this.settingsBox.add([shade, panel, title, this.settingsText, profileTitle, ...this.profileChoices.map(p => p.button),
      profileHint, this.settingsSave, this.settingsCancel, this.settingsHint]);
  }

  openSettingsDialog() {
    if (this.isDialogOpen) return;
    this.isDialogOpen = true; this.settingsIndex = 0;
    const save = this.registry.get('saveData') || {};
    this.pendingSettings = { autoAim: Boolean(save.settings?.autoAim), controlProfile: controlProfileId(save.settings?.controlProfile) };
    const close = saveChanges => {
      if (saveChanges) this.applySettings();
      this.settingsBox.setVisible(false); this.settingsActions = null; this.isDialogOpen = false; this.pendingSettings = null;
    };
    const cycleProfile = delta => {
      const ids = Object.keys(CONTROL_PROFILES), index = ids.indexOf(this.pendingSettings.controlProfile);
      this.pendingSettings.controlProfile = ids[(index + delta + ids.length) % ids.length];
      this.updateSettingsText();
    };
    this.settingsActions = {
      up: () => { this.settingsIndex = (this.settingsIndex + 2) % 3; this.updateSettingsText(); },
      down: () => { this.settingsIndex = (this.settingsIndex + 1) % 3; this.updateSettingsText(); },
      left: () => { if (this.settingsIndex === 1) cycleProfile(-1); },
      right: () => { if (this.settingsIndex === 1) cycleProfile(1); },
      confirm: () => {
        if (this.settingsIndex === 2) { close(true); return; }
        if (this.settingsIndex === 1) { cycleProfile(1); return; }
        this.pendingSettings.autoAim = !this.pendingSettings.autoAim; this.updateSettingsText();
      },
      back: () => close(false),
    };
    this.updateSettingsText(); this.settingsBox.setVisible(true);
  }

  updateSettingsText() {
    this.settingsText.setText('Auto-Anvisieren: ' + (this.pendingSettings?.autoAim ? 'An' : 'Aus'));
    this.settingsText.setColor(this.settingsIndex === 0 ? '#ffe0a0' : '#bdd0b0');
    this.settingsSave.setColor(this.settingsIndex === 2 ? '#ffe0a0' : '#fff1c5');
    this.profileChoices.forEach(({ id, button }) => {
      const selected = id === this.pendingSettings?.controlProfile;
      button.setBackgroundColor(selected ? '#77613a' : '#344f3b');
      button.setColor(selected ? '#ffe6a8' : '#bdd0b0');
      button.setText((selected ? '✓ ' : '') + CONTROL_PROFILES[id].name.replace(' Tastatur', '\nTastatur'));
    });
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
    this.game?.portableControls?.setProfile(nextSave.settings.controlProfile);
  }

  toggleFullscreen() {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    } else {
      this.scale.startFullscreen();
    }
  }
}
