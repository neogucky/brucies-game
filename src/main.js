import BootScene from "./scenes/BootScene.js";
import MainMenuScene from "./scenes/MainMenuScene.js";
import LevelSelectScene from "./scenes/LevelSelectScene.js";
import DesertRuinScene from "./scenes/DesertRuinScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 960,
  height: 600,
  backgroundColor: "#1f1a12",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MainMenuScene, LevelSelectScene, DesertRuinScene],
};

new Phaser.Game(config);
