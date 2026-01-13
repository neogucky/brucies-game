import { defaultSave, loadSave } from "../saveManager.js";
import { playMusic } from "../soundManager.js";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    this.createLoadingUI();
    this.load.once("filecomplete-image-menu-bg", () => {
      if (this.menuBg) return;
      const bg = this.add.image(480, 300, "menu-bg");
      const scale = Math.max(960 / bg.width, 600 / bg.height);
      bg.setScale(scale);
      bg.setDepth(-2);
      this.menuBg = bg;
    });
    this.load.once("filecomplete-audio-music-menu", () => {
      playMusic(this, "music-menu");
    });
    this.load.image("desert-start", "assets/scenes/desert/desert_start.png");
    this.load.image("desert-end", "assets/scenes/desert/desert_end.png");
    this.load.image("desert-lost", "assets/scenes/desert/desert_lost.png");
    this.load.image("menu-bg", "assets/scenes/menu/menu.png");
    this.load.image("ui-coin", "assets/ui/coin.png");
    this.load.image("ui-heart", "assets/ui/heart.png");
    this.load.image("ui-heart-empty", "assets/ui/heart_empty.png");
    this.load.image("knight-standing", "assets/knight/knight_standing.png");
    this.load.image("knight-hitting", "assets/knight/knight_hitting.png");
    this.load.image("knight-female-standing", "assets/knight/knight_female_standing.png");
    this.load.image("knight-female-hitting", "assets/knight/knight_female_hitting.png");
    this.load.image("desert-ruin", "assets/ruin.png");
    this.load.image("desert-ruin-repaired", "assets/ruin_repaired.png");
    this.load.image("worldmap-ruin", "assets/worldmap/ruin.png");
    this.load.image("worldmap-ruin-repaired", "assets/worldmap/ruin_repaired.png");
    this.load.image("desert-bg", "assets/background/desert.png");
    this.load.image("worldmap-bg", "assets/background/desert_world.png");
    this.load.image("tavern-map", "assets/worldmap/tavern.png");
    this.load.image("tavern-bg", "assets/background/tavern.png");
    this.load.image("tavern-loading", "assets/tavern/tavern_loading.png");
    this.load.image("tavern-barkeeper", "assets/tavern/barkeeper.png");
    this.load.image("item-sword", "assets/items/sword.png");
    this.load.image("item-shield", "assets/items/shield.png");
    this.load.image("item-honey", "assets/items/honey-juice.png");
    this.load.image("item-companion", "assets/items/companion.png");
    this.load.image("companion-running", "assets/companion/companien_running.png");
    this.load.image("companion-searching", "assets/companion/companion_searching.png");
    this.load.image("companion-detected", "assets/companion/companion_detected.png");
    this.load.image("companion-attacking", "assets/companion/companion_attacking.png");
    this.load.image("desert-mole-digging", "assets/enemies/desertmole_digging.png");
    this.load.image("desert-mole-running", "assets/enemies/desertmole_running.png");
    this.load.image("desert-mole-attacking", "assets/enemies/desertmole_attacking.png");
    this.load.image("chest-closed", "assets/objects/chest_closed.png");
    this.load.image("chest-open", "assets/objects/chest_open.png");
    this.load.audio("sfx-chest-hit", "assets/sounds/chest_hit.wav");
    this.load.audio("sfx-coin", "assets/sounds/coin.wav");
    this.load.audio("sfx-companion-hit", "assets/sounds/companion_hit.wav");
    this.load.audio("sfx-monster-attack", "assets/sounds/monster_atttack.wav");
    this.load.audio("sfx-monster-dig", "assets/sounds/monster_dig.wav");
    this.load.audio("sfx-monster-injured", "assets/sounds/monster_injured.wav");
    this.load.audio("sfx-monster-miss", "assets/sounds/monster_miss.wav");
    this.load.audio("sfx-sword-slash", "assets/sounds/sword_slash.wav");
    this.load.audio("sfx-success", "assets/sounds/success.wav");
    this.load.audio("sfx-companion-fear", "assets/sounds/companion_fear.mp3");
    this.load.audio("sfx-gameover", "assets/sounds/gameover.wav");
    this.load.audio("music-desert", "assets/sounds/music-desert.mp3");
    this.load.audio("music-menu", "assets/sounds/music-menu.mp3");
    this.load.audio("music-world", "assets/sounds/music-world.mp3");
    this.load.audio("music-tavern", "assets/sounds/music-tavern.mp3");
  }

  create() {
    const saveData = loadSave();
    this.registry.set("saveData", { ...defaultSave, ...saveData });
    this.scene.start("MainMenuScene");
  }

  createLoadingUI() {
    const barWidth = 360;
    const barHeight = 16;
    const bg = this.add.rectangle(480, 300, barWidth, barHeight, 0x1e150c, 0.7);
    bg.setStrokeStyle(2, 0x8a6b44);
    const fill = this.add.rectangle(480 - barWidth / 2, 300, 2, barHeight - 4, 0xf7edd6, 0.9);
    fill.setOrigin(0, 0.5);
    const label = this.add
      .text(480, 270, "Lade Spiel...", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#f7edd6",
      })
      .setOrigin(0.5)
      .setStroke("#433320", 2);

    this.load.on("progress", (value) => {
      fill.displayWidth = Math.max(2, (barWidth - 4) * value);
    });

    this.load.once("complete", () => {
      bg.destroy();
      fill.destroy();
      label.destroy();
    });
  }
}
