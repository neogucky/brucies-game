import { saveProgress } from "../saveManager.js";

export default class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "CharacterSelectScene" });
    this.selectedIndex = 0;
    this.selectSprites = [];
  }

  create() {
    this.addBackground();
    this.addTitle();
    this.createCharacters();
    this.addHints();
    this.handleInput();
    this.updateSelection(false);
  }

  addBackground() {
    const bg = this.add.image(480, 300, "menu-bg");
    const scale = Math.max(960 / bg.width, 600 / bg.height);
    bg.setScale(scale);
  }

  addTitle() {
    this.add
      .text(480, 110, "Wähle deinen Helden", {
        fontFamily: "Georgia, serif",
        fontSize: "36px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setStroke("#433320", 3);
  }

  createCharacters() {
    const boxStyle = { fill: 0x7a5b3a, stroke: 0x4b3824 };
    const maleBox = this.add.rectangle(300, 320, 240, 260, boxStyle.fill, 0.85);
    maleBox.setStrokeStyle(3, boxStyle.stroke);
    const femaleBox = this.add.rectangle(660, 320, 240, 260, boxStyle.fill, 0.85);
    femaleBox.setStrokeStyle(3, boxStyle.stroke);

    const male = this.add.image(300, 320, "knight-standing").setScale(0.7);
    const female = this.add.image(660, 320, "knight-female-standing").setScale(0.7);
    this.selectSprites = [
      {
        sprite: male,
        box: maleBox,
        standing: "knight-standing",
        hitting: "knight-hitting",
        label: "Ritter",
      },
      {
        sprite: female,
        box: femaleBox,
        standing: "knight-female-standing",
        hitting: "knight-female-hitting",
        label: "Ritterin",
      },
    ];

    this.selectSprites.forEach((entry, index) => {
      const label = this.add
        .text(entry.sprite.x, 420, entry.label, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "18px",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setStroke("#433320", 2);
      entry.labelText = label;
      if (index === this.selectedIndex) {
        this.playSwing(entry);
      }
    });
  }

  addHints() {
    this.add
      .text(480, 520, "Links/Rechts wählen, Enter bestätigen", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setStroke("#433320", 2);
  }

  handleInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("A,D");
    this.input.keyboard.on("keydown-LEFT", () => this.setIndex(0));
    this.input.keyboard.on("keydown-RIGHT", () => this.setIndex(1));
    this.input.keyboard.on("keydown-A", () => this.setIndex(0));
    this.input.keyboard.on("keydown-D", () => this.setIndex(1));
    this.input.keyboard.on("keydown-ENTER", () => this.confirmSelection());
    this.input.keyboard.on("keydown-F", () => this.toggleFullscreen());
  }

  setIndex(index) {
    if (index === this.selectedIndex) return;
    this.selectedIndex = index;
    this.updateSelection(true);
  }

  updateSelection(playSwing) {
    this.selectSprites.forEach((entry, index) => {
      const isSelected = index === this.selectedIndex;
      entry.sprite.setAlpha(isSelected ? 1 : 0.6);
      entry.labelText.setAlpha(isSelected ? 1 : 0.6);
      if (entry.box) {
        entry.box.setAlpha(isSelected ? 0.95 : 0.7);
      }
      if (isSelected && playSwing) {
        this.playSwing(entry);
      }
    });
  }

  playSwing(entry) {
    entry.sprite.setTexture(entry.hitting);
    entry.sprite.setScale(0.7);
    const sound = this.sound.add("sfx-sword-slash");
    sound.play();
    this.time.delayedCall(200, () => {
      if (!entry.sprite.active) return;
      entry.sprite.setTexture(entry.standing);
    });
  }

  confirmSelection() {
    const choice = this.selectedIndex === 1 ? "female" : "male";
    const saveData = this.registry.get("saveData") || {};
    const nextSave = {
      ...saveData,
      playerGender: choice,
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);
    this.scene.start("DessertMapScene");
  }

  toggleFullscreen() {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    } else {
      this.scale.startFullscreen();
    }
  }
}
