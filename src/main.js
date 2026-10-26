import ExpertScene from "./scenes/ExpertScene.js";
import HammerTrainingScene from "./scenes/HammerTrainingScene.js";
import IntroScene from "./scenes/IntroScene.js";
import BootScene from "./scenes/BootScene.js";
import MainMenuScene from "./scenes/MainMenuScene.js";
import CharacterSelectScene from "./scenes/CharacterSelectScene.js";
import DesertRuinScene from "./scenes/desert/DesertRuinScene.js";
import DesertEndlessScene from "./scenes/desert/DesertEndlessScene.js";
import DesertTunnelScene from "./scenes/desert/DesertTunnelScene.js";
import DessertMapScene from "./scenes/DessertMapScene.js";
import UndergroundMapScene from "./scenes/UndergroundMapScene.js";
import TavernScene from "./scenes/desert/TavernScene.js";
import UndergroundDigScene from "./scenes/underground/UndergroundDigScene.js";
import UndergroundShopScene from "./scenes/underground/UndergroundShopScene.js";
import JungleMapScene from "./scenes/jungle/JungleMapScene.js";
import WaterMapScene from './scenes/water/WaterMapScene.js';
import JungleScene from "./scenes/jungle/JungleScene.js";
import JungleShopScene from "./scenes/jungle/JungleShopScene.js";
import { installGameSystems } from "./utils/gameSystems.js";

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
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: document.getElementById("play-shell"),
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
    IntroScene,
    MainMenuScene,
    CharacterSelectScene,
    DessertMapScene,
    UndergroundMapScene,
    DesertRuinScene,
    DesertEndlessScene,
    DesertTunnelScene,
    UndergroundDigScene,
    TavernScene,
    UndergroundShopScene,
    JungleMapScene,
    WaterMapScene,
    JungleScene,
    JungleShopScene,
    ExpertScene,
    HammerTrainingScene,
  ],
};

const game = new Phaser.Game(config);
installGameSystems(game);
