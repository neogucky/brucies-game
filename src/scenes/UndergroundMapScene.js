import { saveProgress } from "../saveManager.js";
import { playMusic } from "../soundManager.js";
import TopHud from "../ui/topHud.js";
import CoordinateDebugger from "../utils/coordinateDebugger.js";

const NODES = [
  {
    id: "UnderShop",
    label: "Händlerin",
    x: 465,
    y: 130,
    neighbors: {},
  },
];

export default class UndergroundMapScene extends Phaser.Scene {
  constructor() {
    super({ key: "UndergroundMapScene" });
    this.currentNode = null;
  }

  create() {
    this.addBackground();
    this.createNodes();
    this.createPlayerMarker();
    this.createUI();
    playMusic(this, "music-world");

    const saveData = this.registry.get("saveData") || {};
    this.health = saveData.health ?? 5;
    this.maxHealth = 5;
    this.consumables = { ...(saveData.consumables || {}) };
    this.hud = new TopHud(this, {
      coins: saveData.coins ?? 0,
      health: this.health,
      maxHealth: this.maxHealth,
      consumables: this.consumables,
      activeDisabled: true,
      showCompanion: true,
      companionHealth: 1,
      companionRespawnRatio: 0,
    });

    this.input.keyboard.on("keydown-ENTER", () => this.startCurrentLevel());
    this.input.keyboard.on("keydown-T", () => this.useConsumable());
    const returnToDesert = () => this.returnToDesert();
    this.input.keyboard.on("keydown-UP", returnToDesert);
    this.input.keyboard.on("keydown-W", returnToDesert);
    this.input.keyboard.on("keydown-ESC", returnToDesert);
    this.coordDebugger = new CoordinateDebugger(this);
    this.input.keyboard.on("keydown-F", () => this.toggleFullscreen());
  }

  addBackground() {
    const bg = this.add.image(480, 300, "worldmap-underground-bg");
    const scale = Math.max(960 / bg.width, 600 / bg.height);
    bg.setScale(scale);
    bg.setDepth(-2);
  }

  createNodes() {
    const path = this.add.graphics();
    path.setDepth(-1);
    path.lineStyle(4, 0x9a7c56, 1);
    path.strokeLineShape(new Phaser.Geom.Line(NODES[0].x, 40, NODES[0].x, NODES[0].y + 18));
    this.nodeSprites = new Map();
    NODES.forEach((node) => {
      const icon = this.add.image(node.x, node.y, "underground-shop-map").setScale(0.3);
      this.nodeSprites.set(node.id, { icon });
    });
  }

  createPlayerMarker() {
    const saveData = this.registry.get("saveData") || {};
    const startNode = NODES[0];
    this.currentNode = startNode;
    const isFemale = saveData.playerGender === "female";
    const standingTexture = isFemale ? "knight-female-standing" : "knight-standing";
    this.playerMarker = this.add.image(startNode.x, startNode.y + 6, standingTexture);
    this.playerMarker.setScale(0.46);
    this.companionMarker = this.add.image(
      startNode.x - 18,
      startNode.y + 12,
      "companion-running"
    );
    this.companionMarker.setScale(0.46);
  }

  createUI() {
    this.hintText = this.add
      .text(40, 590, "Enter = Shop, W/Pfeil hoch/Esc = Wüstenkarte", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0, 1)
      .setStroke("#3b2a17", 2);

    this.locationText = this.add
      .text(950, 590, "Unterwelt", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(1, 1)
      .setStroke("#3b2a17", 2);
  }

  startCurrentLevel() {
    if (!this.currentNode) return;
    const saveData = this.registry.get("saveData") || {};
    const nextSave = {
      ...saveData,
      currentLevel: this.currentNode.id,
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);
    this.scene.start("TavernScene", { from: "underground" });
  }

  returnToDesert() {
    const saveData = this.registry.get("saveData") || {};
    const nextSave = {
      ...saveData,
      currentLevel: "Fremdweg",
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);
    this.scene.start("WorldMapScene");
  }

  useConsumable() {
    if (!this.hud) return;
    const result = this.hud.tryUseHoney({
      count: this.consumables?.honey ?? 0,
      health: this.health,
      maxHealth: this.maxHealth,
      companionHealth: 1,
      companionRespawnAt: 0,
    });
    if (!result.consumed) return;
    this.health = result.health;
    this.consumables.honey = result.count;
    const saveData = this.registry.get("saveData") || {};
    const nextSave = {
      ...saveData,
      health: this.health,
      consumables: {
        ...saveData.consumables,
        honey: this.consumables.honey,
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
