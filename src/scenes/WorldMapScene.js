import { saveProgress } from "../saveManager.js";
import { playMusic } from "../soundManager.js";
import TopHud from "../ui/topHud.js";
import CoordinateDebugger from "../utils/coordinateDebugger.js";

const NODES = [
  {
    id: "Wuestenruine",
    label: "Wüstenruine",
    x: 180,
    y: 490,
    neighbors: { right: "Taverne" },
  },
  {
    id: "Taverne",
    label: "Taverne",
    x: 420,
    y: 410,
    neighbors: { left: "Wuestenruine", up: "DesertEndless", down: "Fremdweg" },
  },
  {
    id: "DesertEndless",
    label: "Wüstenendlos",
    x: 620,
    y: 250,
    neighbors: { down: "Taverne" },
  },
  {
    id: "Fremdweg",
    label: "Fremdweg",
    x: 720,
    y: 460,
    neighbors: { up: "Taverne" },
  },
];

export default class WorldMapScene extends Phaser.Scene {
  constructor() {
    super({ key: "WorldMapScene" });
    this.currentNode = null;
    this.isMoving = false;
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

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D");
    this.input.keyboard.on("keydown-ENTER", () => this.startCurrentLevel());
    this.input.keyboard.on("keydown-T", () => this.useConsumable());
    this.coordDebugger = new CoordinateDebugger(this);
    this.handleKeyDown = (event) => {
      if (event.code === "Escape") {
        this.time.delayedCall(0, () => {
          this.scene.stop("WorldMapScene");
          this.scene.start("MainMenuScene");
        });
      }
    };
    this.input.keyboard.on("keydown", this.handleKeyDown);
    this.events.once("shutdown", () => {
      this.input.keyboard.off("keydown", this.handleKeyDown);
    });
  }

  ensureUnlocks() {
    const saveData = this.registry.get("saveData") || {};
    const unlocked = new Set(saveData.unlockedLevels || []);
    if (saveData.completedLevels?.includes("Wuestenruine") || unlocked.has("Taverne")) {
      unlocked.add("DesertEndless");
      unlocked.add("Fremdweg");
    }
    if (unlocked.size !== (saveData.unlockedLevels || []).length) {
      const nextSave = { ...saveData, unlockedLevels: Array.from(unlocked) };
      this.registry.set("saveData", nextSave);
      saveProgress(nextSave);
    }
  }

  addBackground() {
    const bg = this.add.image(480, 300, "worldmap-bg");
    const scale = Math.max(960 / bg.width, 600 / bg.height);
    bg.setScale(scale);
    bg.setDepth(-2);
  }

  drawPaths() {
    const graphics = this.add.graphics();
    graphics.setDepth(-1);
    graphics.lineStyle(4, 0x9a7c56, 1);
    for (let i = 0; i < NODES.length; i += 1) {
      const node = NODES[i];
      Object.values(node.neighbors).forEach((neighborId) => {
        const neighbor = NODES.find((item) => item.id === neighborId);
        if (!neighbor) return;
        if (!this.unlocked.has(node.id) || !this.unlocked.has(neighbor.id)) return;
        graphics.strokeLineShape(
          new Phaser.Geom.Line(
            node.x,
            node.y + 20,
            neighbor.x,
            neighbor.y + 20
          )
        );
      });
    }
    const fremdweg = NODES.find((node) => node.id === "Fremdweg");
    if (fremdweg && this.unlocked.has("Fremdweg")) {
      const saveData = this.registry.get("saveData") || {};
      if (saveData.completedLevels?.includes("Fremdweg")) {
        graphics.strokeLineShape(
          new Phaser.Geom.Line(
            fremdweg.x,
            fremdweg.y + 20,
            fremdweg.x,
            Math.min(590, fremdweg.y + 90)
          )
        );
      }
    }
  }

  createNodes() {
    const saveData = this.registry.get("saveData") || {};
    this.unlocked = new Set(saveData.unlockedLevels || []);
    this.nodeSprites = new Map();

    NODES.forEach((node) => {
      const isUnlocked = this.unlocked.has(node.id);
      let label = null;
      let icon = null;
      if (node.id === "Wuestenruine" && isUnlocked) {
        const isCompleted = saveData.completedLevels?.includes("Wuestenruine");
        const ruinKey = isCompleted
          ? "worldmap-ruin-repaired"
          : "worldmap-ruin";
        icon = this.add.image(node.x, node.y, ruinKey).setScale(0.312);
        if (isCompleted && !saveData.repairedRuinShown) {
          this.animateRepairedRuin(icon);
          const nextSave = {
            ...saveData,
            repairedRuinShown: true,
          };
          this.registry.set("saveData", nextSave);
          saveProgress(nextSave);
        }
      } else if (node.id === "Taverne" && isUnlocked) {
        icon = this.add.image(node.x, node.y, "tavern-map").setScale(0.3);
      } else if (node.id === "Fremdweg" && isUnlocked) {
        const isCompleted = saveData.completedLevels?.includes("Fremdweg");
        const quarryKey = isCompleted ? "worldmap-quarry-tunnel" : "worldmap-quarry";
        icon = this.add.image(node.x, node.y, quarryKey).setScale(0.3);
      } else {
        icon = this.add.image(node.x, node.y, "worldmap-ruin").setScale(0.281);
        icon.setAlpha(isUnlocked ? 1 : 0.35);
      }

      if (!isUnlocked) {
        label = this.add
          .text(node.x, node.y + 10, "???", {
            fontFamily: "Trebuchet MS, sans-serif",
            fontSize: "14px",
            color: "#6b5a45",
          })
          .setOrigin(0.5);
      }

      this.nodeSprites.set(node.id, { icon, label });
    });
  }

  createPlayerMarker() {
    const saveData = this.registry.get("saveData");
    const currentId = saveData.currentLevel || "Wuestenruine";
    const startNode = NODES.find((node) => node.id === currentId) || NODES[0];
    this.currentNode = startNode;
    const isFemale = saveData.playerGender === "female";
    const standingTexture = isFemale ? "knight-female-standing" : "knight-standing";
    this.playerMarker = this.add.image(startNode.x, startNode.y + 2, standingTexture);
    this.playerMarker.setScale(0.42);
    this.companionMarker = this.add.image(
      startNode.x - 18,
      startNode.y + 8,
      "companion-running"
    );
    this.companionMarker.setScale(0.42);
  }

  createUI() {
    this.hintText = this.add
      .text(40, 590, "Pfeile/WASD = Bewegen, Enter = Start, Esc = Menü", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#3b2a17",
        strokeThickness: 3,
      })
      .setOrigin(0, 1);
    this.lockText = this.add
      .text(480, 520, "", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#6b2f26",
      })
      .setOrigin(0.5);

    this.add
      .text(950, 590, "Wüsten-Land", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#3b2a17",
        strokeThickness: 3,
      })
      .setOrigin(1, 1);
  }

  animateRepairedRuin(ruinSprite) {
    const baseScale = ruinSprite.scale;
    this.tweens.add({
      targets: ruinSprite,
      scale: baseScale * 1.2,
      duration: 350,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut",
    });
  }

  update() {
    if (this.isMoving) return;
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    if (down && this.currentNode?.id === "Fremdweg") {
      const saveData = this.registry.get("saveData") || {};
      if (!saveData.completedLevels?.includes("Fremdweg")) {
        this.lockText.setText("Der Weg nach unten ist noch versperrt.");
        this.time.delayedCall(1000, () => this.lockText.setText(""));
        return;
      }
      this.scene.start("UndergroundMapScene");
      return;
    }

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
      this.lockText.setText("Dieser Ort ist noch gesperrt.");
      this.time.delayedCall(800, () => this.lockText.setText(""));
      return;
    }

    const nextNode = NODES.find((node) => node.id === nextId);
    if (!nextNode) return;
    this.isMoving = true;
    this.tweens.add({
      targets: this.playerMarker,
      x: nextNode.x,
      y: nextNode.y + 2,
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

  startCurrentLevel() {
    if (!this.currentNode || !this.unlocked.has(this.currentNode.id)) return;
    const saveData = this.registry.get("saveData");
    if (
      this.currentNode.id === "Wuestenruine" &&
      saveData.completedLevels?.includes("Wuestenruine")
    ) {
      this.lockText.setText("Die Ruine ist bereits repariert.");
      this.time.delayedCall(1200, () => this.lockText.setText(""));
      return;
    }
    const nextSave = {
      ...saveData,
      currentLevel: this.currentNode.id,
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);

    if (this.currentNode.id === "Wuestenruine") {
      this.scene.start("DesertRuinScene");
    } else if (this.currentNode.id === "DesertEndless") {
      this.scene.start("DesertEndlessScene");
    } else if (this.currentNode.id === "Fremdweg") {
      this.scene.start("DesertTunnelScene");
    } else if (this.currentNode.id === "Taverne") {
      this.scene.start("TavernScene");
    }
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
}
