import BootScene from "./scenes/BootScene.js";
import MainMenuScene from "./scenes/MainMenuScene.js";
import CharacterSelectScene from "./scenes/CharacterSelectScene.js";
import DesertRuinScene from "./scenes/desert/DesertRuinScene.js";
import DesertEndlessScene from "./scenes/desert/DesertEndlessScene.js";
import DesertTunnelScene from "./scenes/desert/DesertTunnelScene.js";
import DessertMapScene from "./scenes/DessertMapScene.js";
import UndergroundMapScene from "./scenes/UndergroundMapScene.js";
import TavernScene from "./scenes/desert/TavernScene.js";

const config = {
  type: Phaser.WEBGL,
  parent: "game",
  width: 960,
  height: 600,
  resolution: 2,
  antialias: true,
  pixelArt: false,
  render: {
    antialias: true,
    antialiasGL: true,
    roundPixels: false,
  },
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: document.getElementById("game"),
  },
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
    DessertMapScene,
    UndergroundMapScene,
    DesertRuinScene,
    DesertEndlessScene,
    DesertTunnelScene,
    TavernScene,
  ],
};

new Phaser.Game(config);
