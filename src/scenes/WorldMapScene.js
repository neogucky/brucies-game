import { saveProgress } from "../saveManager.js";
import { playMusic } from "../soundManager.js";
import TopHud from "../ui/topHud.js";

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
    x: 470,
    y: 320,
    neighbors: { left: "Wuestenruine", right: "Ruinenpass" },
  },
  {
    id: "Ruinenpass",
    label: "Ruinenpass",
    x: 740,
    y: 270,
    neighbors: { left: "Taverne", down: "Schattenhof" },
  },
  {
    id: "Schattenhof",
    label: "Schattenhof",
    x: 640,
    y: 480,
    neighbors: { up: "Ruinenpass" },
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
  }

  createNodes() {
    const saveData = this.registry.get("saveData");
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
        icon = this.add.image(node.x, node.y, "tavern-map").setScale(0.2);
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

    if (left) this.tryMove("left");
    else if (right) this.tryMove("right");
    else if (up) this.tryMove("up");
    else if (down) this.tryMove("down");

    if (this.companionMarker) {
      const side = this.companionMarker.x >= this.playerMarker.x ? 1 : -1;
      const targetX = this.playerMarker.x + side * 18;
      const targetY = this.playerMarker.y + 17;
      this.companionMarker.x = Phaser.Math.Linear(this.companionMarker.x, targetX, 0.12);
      this.companionMarker.y = Phaser.Math.Linear(this.companionMarker.y, targetY, 0.12);
    }
  }

  tryMove(direction) {
    const nextId = this.currentNode.neighbors[direction];
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

  startCurrentLevel() {
    if (!this.currentNode || !this.unlocked.has(this.currentNode.id)) return;
    const saveData = this.registry.get("saveData");
    const nextSave = {
      ...saveData,
      currentLevel: this.currentNode.id,
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);

    if (this.currentNode.id === "Wuestenruine") {
      this.scene.start("DesertRuinScene");
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
