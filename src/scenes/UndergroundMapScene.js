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
    neighbors: { left: "UnderDig" },
  },
  {
    id: "UnderDig",
    label: "Erdgang",
    x: 192,
    y: 127,
    neighbors: { right: "UnderShop" },
  },
];

export default class UndergroundMapScene extends Phaser.Scene {
  constructor() {
    super({ key: "UndergroundMapScene" });
    this.currentNode = null;
    this.entryFromDesert = false;
    this.travelSpeed = 260;
    this.isMoving = false;
  }

  init(data) {
    this.entryFromDesert = Boolean(data?.fromDesert);
  }

  create() {
    this.addBackground();
    this.ensureUnlocks();
    this.createNodes();
    this.drawPaths();
    this.createPlayerMarker();
    this.createUI();
    playMusic(this, "music-world");

    const saveData = this.registry.get("saveData") || {};
    if (!NODES.find((node) => node.id === saveData.currentLevel)) {
      const nextSave = { ...saveData, currentLevel: "UnderShop" };
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
      passiveOwned: saveData.equipment?.shield ?? false,
      activeDisabled: true,
      showCompanion: true,
      companionHealth: 1,
      companionRespawnRatio: 0,
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D");
    this.input.keyboard.on("keydown-ENTER", () => this.startCurrentLevel());
    this.input.keyboard.on("keydown-T", () => this.useConsumable());
    const returnToDesert = () => this.returnToDesert();
    this.input.keyboard.on("keydown-UP", returnToDesert);
    this.input.keyboard.on("keydown-W", returnToDesert);
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("MainMenuScene"));
    this.coordDebugger = new CoordinateDebugger(this);
    this.input.keyboard.on("keydown-F", () => this.toggleFullscreen());
  }

  ensureUnlocks() {
    const saveData = this.registry.get("saveData") || {};
    const unlocked = new Set(saveData.unlockedLevels || []);
    unlocked.add("UnderShop");
    unlocked.add("UnderDig");
    if (unlocked.size !== (saveData.unlockedLevels || []).length) {
      const nextSave = { ...saveData, unlockedLevels: Array.from(unlocked) };
      this.registry.set("saveData", nextSave);
      saveProgress(nextSave);
    }
  }

  addBackground() {
    const bg = this.add.image(480, 300, "worldmap-underground-bg");
    const scale = Math.max(960 / bg.width, 600 / bg.height);
    bg.setScale(scale);
    bg.setDepth(-2);
  }

  createNodes() {
    const saveData = this.registry.get("saveData") || {};
    this.unlocked = new Set(saveData.unlockedLevels || []);
    const path = this.add.graphics();
    path.setDepth(-1);
    path.lineStyle(4, 0x9a7c56, 1);
    path.strokeLineShape(new Phaser.Geom.Line(NODES[0].x, 40, NODES[0].x, NODES[0].y + 18));
    this.nodeSprites = new Map();
    NODES.forEach((node) => {
      const isUnlocked = this.unlocked.has(node.id);
      const iconKey = node.id === "UnderShop" ? "underground-shop-map" : "worldmap-ruin";
      const iconScale = node.id === "UnderShop" ? 0.3 : 0.26;
      const icon = this.add.image(node.x, node.y, iconKey).setScale(iconScale);
      icon.setAlpha(isUnlocked ? 1 : 0.35);
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
      if (isUnlocked) {
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
      }
      this.nodeSprites.set(node.id, { icon });
    });
  }

  drawPaths() {
    if (!this.unlocked) return;
    const graphics = this.add.graphics();
    graphics.setDepth(-1);
    graphics.lineStyle(4, 0x9a7c56, 1);
    NODES.forEach((node) => {
      Object.values(node.neighbors || {}).forEach((neighborId) => {
        const neighbor = NODES.find((item) => item.id === neighborId);
        if (!neighbor) return;
        if (!this.unlocked.has(node.id) || !this.unlocked.has(neighbor.id)) return;
        graphics.strokeLineShape(
          new Phaser.Geom.Line(
            node.x,
            node.y + 18,
            neighbor.x,
            neighbor.y + 18
          )
        );
      });
    });
  }

  createPlayerMarker() {
    const saveData = this.registry.get("saveData") || {};
    const currentId = saveData.currentLevel || "UnderShop";
    const startNode = NODES.find((node) => node.id === currentId) || NODES[0];
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

    if (this.entryFromDesert) {
      const edgeY = 40;
      const duration = this.getTravelDuration(edgeY, startNode.y + 6);
      this.playerMarker.setPosition(startNode.x, edgeY);
      this.companionMarker.setPosition(startNode.x - 18, edgeY + 12);
      this.isMoving = true;
      this.tweens.add({
        targets: this.playerMarker,
        x: startNode.x,
        y: startNode.y + 6,
        duration,
        onComplete: () => {
          this.entryFromDesert = false;
          this.isMoving = false;
        },
      });
      this.tweens.add({
        targets: this.companionMarker,
        x: startNode.x - 18,
        y: startNode.y + 12,
        duration: duration + 40,
      });
    }
  }

  createUI() {
    this.hintText = this.add
      .text(14, 585, "Enter = Shop, W/Pfeil hoch = Wüstenkarte, Esc = Menü", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0, 1)
      .setStroke("#3b2a17", 2);

    this.locationText = this.add
      .text(940, 585, "Unterwelt", {
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
    if (this.currentNode.id === "UnderShop") {
      this.scene.start("TavernScene", { from: "underground" });
    } else if (this.currentNode.id === "UnderDig") {
      this.scene.start("UndergroundDigScene");
    }
  }

  returnToDesert() {
    const saveData = this.registry.get("saveData") || {};
    const nextSave = {
      ...saveData,
      currentLevel: "Fremdweg",
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);
    const duration = this.getTravelDuration(this.currentNode.y + 6, 40);
    this.tweens.add({
      targets: this.playerMarker,
      x: this.currentNode.x,
      y: 40,
      duration,
      onComplete: () => {
        this.scene.start("DessertMapScene", { fromUnderground: true });
      },
    });
    this.tweens.add({
      targets: this.companionMarker,
      x: this.currentNode.x - 18,
      y: 52,
      duration: duration + 40,
    });
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

  getTravelDuration(fromY, toY) {
    const distance = Math.abs(toY - fromY);
    return Math.max(220, Math.round((distance / this.travelSpeed) * 1000));
  }

  update() {
    if (this.isMoving) return;
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    if (left) this.tryMove({ x: -1, y: 0 });
    else if (right) this.tryMove({ x: 1, y: 0 });
    else if (up) this.tryMove({ x: 0, y: -1 });
    else if (down) this.tryMove({ x: 0, y: 1 });

    if (this.companionMarker) {
      const side = this.companionMarker.x >= this.playerMarker.x ? 1 : -1;
      const targetX = this.playerMarker.x + side * 18;
      const targetY = this.playerMarker.y + 17;
      this.companionMarker.x = Phaser.Math.Linear(this.companionMarker.x, targetX, 0.12);
      this.companionMarker.y = Phaser.Math.Linear(this.companionMarker.y, targetY, 0.12);
    }
  }

  tryMove(direction) {
    const nextId = this.getNeighborForDirection(direction);
    if (!nextId) return;
    if (!this.unlocked.has(nextId)) {
      return;
    }
    const nextNode = NODES.find((node) => node.id === nextId);
    if (!nextNode) return;
    this.isMoving = true;
    this.tweens.add({
      targets: this.playerMarker,
      x: nextNode.x,
      y: nextNode.y + 6,
      duration: 400,
      onComplete: () => {
        this.currentNode = nextNode;
        this.isMoving = false;
      },
    });
    if (this.companionMarker) {
      this.tweens.add({
        targets: this.companionMarker,
        x: nextNode.x - 18,
        y: nextNode.y - 6,
        duration: 460,
      });
    }
  }

  getNeighborForDirection(direction) {
    if (!this.currentNode) return null;
    const candidates = Object.values(this.currentNode.neighbors || {});
    let bestId = null;
    let bestDot = 0.25;
    candidates.forEach((id) => {
      const node = NODES.find((item) => item.id === id);
      if (!node) return;
      const dx = node.x - this.currentNode.x;
      const dy = node.y - this.currentNode.y;
      const length = Math.hypot(dx, dy);
      if (length === 0) return;
      const dot = (dx / length) * direction.x + (dy / length) * direction.y;
      if (dot > bestDot) {
        bestDot = dot;
        bestId = id;
      }
    });
    return bestId;
  }
}
