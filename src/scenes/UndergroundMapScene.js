import { saveProgress } from "../saveManager.js";
import { playMusic } from "../soundManager.js";
import TopHud from "../ui/topHud.js";
import CoordinateDebugger from "../utils/coordinateDebugger.js";

const NODES = [
  {
    id: "UnderShop",
    label: "Händlerin",
    x: 445,
    y: 210,
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
    if (saveData.currentLevel !== "UnderShop") {
      const nextSave = {
        ...saveData,
        currentLevel: "UnderShop",
      };
      this.registry.set("saveData", nextSave);
      saveProgress(nextSave);
    }
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
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("MainMenuScene"));
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
      icon.setDepth(2);
      const glowKey = "worldmap-glow";
      if (!this.textures.exists(glowKey)) {
        const size = 160;
        const canvasTexture = this.textures.createCanvas(glowKey, size, size);
        const ctx = canvasTexture.getContext();
        const grad = ctx.createRadialGradient(
          size / 2,
          size / 2,
          10,
          size / 2,
          size / 2,
          size / 2
        );
        grad.addColorStop(0, "rgba(255,226,161,0.9)");
        grad.addColorStop(0.6, "rgba(255,226,161,0.4)");
        grad.addColorStop(1, "rgba(255,226,161,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        canvasTexture.refresh();
      }
      const glow = this.add.image(node.x, node.y + 8, glowKey);
      glow.setDepth(1);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setScale(0.9, 0.63);
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.5, to: 0.85 },
        scaleX: { from: 0.9, to: 1.1 },
        scaleY: { from: 0.65, to: 0.8 },
        duration: 1400,
        yoyo: true,
        repeat: -1,
      });
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
    this.playerMarker.setDepth(5);
    this.companionMarker = this.add.image(
      startNode.x - 18,
      startNode.y + 12,
      "companion-running"
    );
    this.companionMarker.setScale(0.46);
    this.companionMarker.setDepth(5);
  }

  createUI() {
    this.hintText = this.add
      .text(14, 590, "Enter = Shop, W/Pfeil hoch = Wüstenkarte, Esc = Menü", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0, 1)
      .setStroke("#3b2a17", 2);

    this.locationText = this.add
      .text(945, 590, "Unterwelt", {
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
    this.scene.start("DessertMapScene");
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
