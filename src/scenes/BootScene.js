import { defaultSave, loadSave } from "../saveManager.js";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    this.load.image("desert-start", "assets/scenes/desert/desert_start.png");
    this.load.image("desert-end", "assets/scenes/desert/desert_end.png");
    this.load.image("desert-lost", "assets/scenes/desert/desert_lost.png");
    this.load.image("menu-bg", "assets/scenes/menu/menu.png");
    this.load.image("ui-coin", "assets/ui/coin.png");
    this.load.image("ui-heart", "assets/ui/heart.png");
    this.load.image("ui-heart-empty", "assets/ui/heart_empty.png");
    this.load.audio("sfx-chest-hit", "assets/sounds/chest_hit.wav");
    this.load.audio("sfx-coin", "assets/sounds/coin.wav");
    this.load.audio("sfx-companion-hit", "assets/sounds/companion_hit.wav");
    this.load.audio("sfx-monster-attack", "assets/sounds/monster_atttack.wav");
    this.load.audio("sfx-monster-dig", "assets/sounds/monster_dig.wav");
    this.load.audio("sfx-monster-injured", "assets/sounds/monster_injured.wav");
    this.load.audio("sfx-monster-miss", "assets/sounds/monster_miss.wav");
    this.load.audio("sfx-sword-slash", "assets/sounds/sword_slash.wav");
  }

  create() {
    const saveData = loadSave();
    this.registry.set("saveData", { ...defaultSave, ...saveData });
    this.scene.start("MainMenuScene");
  }
}
