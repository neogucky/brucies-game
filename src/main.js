import BootScene from "./scenes/BootScene.js";
import MainMenuScene from "./scenes/MainMenuScene.js";
import CharacterSelectScene from "./scenes/CharacterSelectScene.js";
import DesertRuinScene from "./scenes/DesertRuinScene.js";
import WorldMapScene from "./scenes/WorldMapScene.js";
import TavernScene from "./scenes/TavernScene.js";

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
  scene: [
    BootScene,
    MainMenuScene,
    CharacterSelectScene,
    WorldMapScene,
    DesertRuinScene,
    TavernScene,
  ],
};

new Phaser.Game(config);
