import { saveProgress } from "../saveManager.js";
import { playMusic } from "../soundManager.js";

const NODES = [
  {
    id: "Wuestenruine",
    label: "Wüstenruine",
    x: 180,
    y: 340,
    neighbors: { right: "Taverne" },
  },
  {
    id: "Taverne",
    label: "Taverne",
    x: 470,
    y: 280,
    neighbors: { left: "Wuestenruine", right: "Ruinenpass" },
  },
  {
    id: "Ruinenpass",
    label: "Ruinenpass",
    x: 740,
    y: 210,
    neighbors: { left: "Taverne", down: "Schattenhof" },
  },
  {
    id: "Schattenhof",
    label: "Schattenhof",
    x: 640,
    y: 420,
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
    this.drawPaths();
    this.createNodes();
    this.createPlayerMarker();
    this.createUI();
    playMusic(this, "music-world");
    this.createItemUI();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D");
    this.input.keyboard.on("keydown-ENTER", () => this.startCurrentLevel());
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("MainMenuScene"));
  }

  addBackground() {
    this.add.rectangle(480, 300, 960, 600, 0xefe3c7);
    this.add.rectangle(480, 300, 900, 520, 0xe0d0ad).setAlpha(0.9);
  }

  drawPaths() {
    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0x9a7c56, 1);
    for (let i = 0; i < NODES.length; i += 1) {
      const node = NODES[i];
      Object.values(node.neighbors).forEach((neighborId) => {
        const neighbor = NODES.find((item) => item.id === neighborId);
        if (!neighbor) return;
        graphics.strokeLineShape(new Phaser.Geom.Line(node.x, node.y, neighbor.x, neighbor.y));
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
          ? "desert-ruin-repaired"
          : "desert-ruin";
        icon = this.add.image(node.x, node.y - 40, ruinKey).setScale(0.2);
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
        icon = this.add.image(node.x, node.y - 38, "tavern-map").setScale(0.2);
      } else {
        icon = this.add.image(node.x, node.y - 40, "desert-ruin").setScale(0.18);
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
    this.playerMarker = this.add.image(startNode.x, startNode.y - 18, "knight-standing");
    this.playerMarker.setScale(0.35);
  }

  createUI() {
    this.hintText = this.add
      .text(40, 590, "Pfeile/WASD = Bewegen, Enter = Start, Esc = Menü", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "14px",
        color: "#5b4a34",
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
        color: "#5b4a34",
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

  createItemUI() {
    const saveData = this.registry.get("saveData") || {};
    const honeyCount = saveData.consumables?.honey ?? 0;
    const frameWidth = 52;
    const frameHeight = 52;
    const spacing = 80;
    const startX = 320;
    const y = 36;

    this.itemUI = {};
    const items = [
      { key: "active", label: "Schwert", hint: "Leertaste", disabled: true, icon: "item-sword" },
      { key: "passive", label: "Schild", hint: "Passiv", icon: "item-shield" },
      { key: "consumable", label: honeyCount > 0 ? "Honigsaft" : "Leer", hint: "T", icon: "item-honey" },
    ];

    items.forEach((item, index) => {
      const x = startX + index * spacing;
      const frame = this.add.rectangle(x, y, frameWidth, frameHeight, 0xf2e3c5, 0.8);
      frame.setStrokeStyle(2, 0x8a6b44);
      const label = this.add
        .text(x, y - 4, item.label, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "12px",
          color: "#4b3824",
        })
        .setOrigin(0.5);
      const icon = this.add.image(x, y, item.icon).setScale(0.26);
      let overlay = null;
      const hint = this.add
        .text(x, y + 36, item.hint, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "12px",
          color: "#4b3824",
        })
        .setOrigin(0.5);
      const count = this.add
        .text(x + 18, y - 18, honeyCount > 0 && item.key === "consumable" ? `x${honeyCount}` : "", {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "12px",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      if (item.disabled) {
        frame.setFillStyle(0xd1c2a3, 0.6);
        label.setColor("#8b8373");
        hint.setColor("#8b8373");
        overlay = this.add.rectangle(x, y, frameWidth, frameHeight, 0x6f6f6f, 0.6);
      }

      this.itemUI[item.key] = { frame, label, hint, count, icon, overlay };
    });
    this.itemUI.consumable.icon.setAlpha(honeyCount > 0 ? 1 : 0.25);
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
      y: nextNode.y - 18,
      duration: 400,
      onComplete: () => {
        this.currentNode = nextNode;
        this.isMoving = false;
      },
    });
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
}
