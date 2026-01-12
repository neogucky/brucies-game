import { saveProgress } from "../saveManager.js";

const LEVELS = [
  {
    id: "Wuestenruine",
    title: "Wüstenruine",
    subtitle: "Wehre Monster ab und sammle Münzen in der Wüste.",
  },
];

export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "LevelSelectScene" });
    this.levelItems = [];
    this.selectedIndex = 0;
  }

  create() {
    this.addBackground();
    this.addHeader();
    this.addLevelList();
    this.addFooter();
    this.updateSelection();

    this.input.keyboard.on("keydown-UP", () => this.moveSelection(-1));
    this.input.keyboard.on("keydown-DOWN", () => this.moveSelection(1));
    this.input.keyboard.on("keydown-ENTER", () => this.startSelectedLevel());
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("MainMenuScene"));
  }

  addBackground() {
    this.add.rectangle(480, 300, 960, 600, 0x2b2118).setAlpha(0.95);
    this.add.circle(760, 140, 90, 0xd9b85e).setAlpha(0.4);
    this.add.rectangle(180, 480, 260, 120, 0x5c4732).setAlpha(0.5);
  }

  addHeader() {
    this.add
      .text(480, 80, "Levelauswahl", {
        fontFamily: "Georgia, serif",
        fontSize: "40px",
        color: "#f5e2bd",
      })
      .setOrigin(0.5);

    this.add
      .text(480, 125, "Wähle dein nächstes Minispiel", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "18px",
        color: "#d8c2a0",
      })
      .setOrigin(0.5);
  }

  addLevelList() {
    const saveData = this.registry.get("saveData");

    LEVELS.forEach((level, index) => {
      const isUnlocked = saveData.unlockedLevels.includes(level.id);
      const label = isUnlocked ? level.title : "???";

      const text = this.add
        .text(480, 240 + index * 70, label, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "28px",
          color: "#cbb698",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: isUnlocked })
        .on("pointerover", () => {
          if (!isUnlocked) return;
          this.selectedIndex = index;
          this.updateSelection();
        })
        .on("pointerdown", () => {
          if (isUnlocked) {
            this.startLevel(level);
          }
        });

      const detail = this.add
        .text(480, 270 + index * 70, level.subtitle, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "16px",
          color: "#a8916f",
        })
        .setOrigin(0.5);

      this.levelItems.push({ text, detail, level, isUnlocked });
    });
  }

  addFooter() {
    this.add
      .text(480, 530, "Enter = Start, Esc = Zurück", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#a8916f",
      })
      .setOrigin(0.5);
  }

  moveSelection(delta) {
    const unlockedItems = this.levelItems.filter((item) => item.isUnlocked);
    if (unlockedItems.length === 0) return;

    const indices = this.levelItems
      .map((item, index) => (item.isUnlocked ? index : null))
      .filter((index) => index !== null);

    const currentPos = indices.indexOf(this.selectedIndex);
    const nextPos = Phaser.Math.Wrap(currentPos + delta, 0, indices.length);
    this.selectedIndex = indices[nextPos];
    this.updateSelection();
  }

  updateSelection() {
    this.levelItems.forEach((item, index) => {
      const isSelected = index === this.selectedIndex && item.isUnlocked;
      item.text.setColor(isSelected ? "#f5e2bd" : "#cbb698");
      item.text.setScale(isSelected ? 1.05 : 1);
      item.detail.setAlpha(item.isUnlocked ? 1 : 0.4);
    });
  }

  startSelectedLevel() {
    const item = this.levelItems[this.selectedIndex];
    if (item && item.isUnlocked) {
      this.startLevel(item.level);
    }
  }

  startLevel(level) {
    const saveData = this.registry.get("saveData");
    const nextSave = {
      ...saveData,
      currentLevel: level.id,
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);

    if (level.id === "Wuestenruine") {
      this.scene.start("DesertRuinScene");
    }
  }
}
