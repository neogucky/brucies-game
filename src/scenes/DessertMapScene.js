import { saveProgress } from "../saveManager.js";
import { playMusic } from "../soundManager.js";
import TopHud from "../ui/topHud.js";
import { applyItemModeSupport, GAME_MODES } from "../utils/itemRegistry.js";
import CoordinateDebugger from "../utils/coordinateDebugger.js";
import InventoryOverlay from "../ui/InventoryOverlay.js";
import { applyInventoryToSave, normalizeInventory } from "../utils/inventory.js";

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

export default class DessertMapScene extends Phaser.Scene {
  constructor() {
    super({ key: "DessertMapScene" });
    this.currentNode = null;
    this.isMoving = false;
    this.entryFromUnderground = false;
    this.travelSpeed = 260;
    this.inventoryOpen = false;
  }

  init(data) {
    this.entryFromUnderground = Boolean(data?.fromUnderground);
  }

  create() {
    this.gameMode = GAME_MODES.ISOMETRIC;
    this.addBackground();
    this.ensureUnlocks();
    this.createNodes();
    this.drawPaths();
    this.createPlayerMarker();
    this.createUI();
    playMusic(this, "music-world");
    const saveData = this.registry.get("saveData") || {};
    const normalized = normalizeInventory(saveData);
    this.inventory = normalized.inventory;
    this.equipped = normalized.equipped;
    const normalizedSave = applyInventoryToSave(saveData, this.inventory, this.equipped);
    this.registry.set("saveData", normalizedSave);
    this.health = normalizedSave.health ?? 5;
    this.maxHealth = 5;
    this.consumables = { honey: this.inventory.consumables?.honey ?? 0 };
    this.hud = new TopHud(this, {
      coins: normalizedSave.coins ?? 0,
      health: this.health,
      maxHealth: this.maxHealth,
      consumables: this.consumables,
      passiveOwned: this.equipped.passive === "shield",
      passiveShoes: this.equipped.passive === "shoes",
      activeEquipped: this.equipped.weapon === "sword",
      passiveEquipped: this.equipped.passive,
      consumableEquipped: this.equipped.consumable === "honey",
      activeDisabled: true,
      showCompanion: true,
      companionHealth: 1,
      companionRespawnRatio: 0,
      keyCollected: Boolean(normalizedSave.undergroundKeyCollected),
    });
    this.hud.setActiveEquipped(this.equipped.weapon === "sword");
    this.hud.setPassiveEquipped(this.equipped.passive);
    this.hud.setConsumableEquipped(this.equipped?.consumable === "honey");
    applyItemModeSupport(this.hud, this.equipped, this.gameMode);
    this.inventoryOverlay = new InventoryOverlay(this, {
      onEquip: (slot, itemId) => this.handleInventoryEquip(slot, itemId),
      onClose: () => this.closeInventory(),
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D");
    this.input.keyboard.on("keydown-ENTER", () => {
      if (this.inventoryOpen || this.inventoryOverlay?.isOpen) return;
      this.startCurrentLevel();
    });
    this.input.keyboard.on("keydown-T", () => this.useConsumable());
    this.coordDebugger = new CoordinateDebugger(this);
    this.input.keyboard.on("keydown-F", () => this.toggleFullscreen());
    this.handleKeyDown = (event) => {
      if (event.code === "Tab") {
        event.preventDefault();
        this.toggleInventory();
        return;
      }
      if (event.code === "Escape") {
        if (this.inventoryOpen) {
          this.closeInventory();
          return;
        }
        this.time.delayedCall(0, () => {
          this.scene.stop("DessertMapScene");
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
            600
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
      } else if (node.id === "DesertEndless" && isUnlocked) {
        icon = this.add.image(node.x, node.y, "worldmap-oasis").setScale(0.3);
      } else {
        icon = this.add.image(node.x, node.y, "worldmap-ruin").setScale(0.281);
        icon.setAlpha(isUnlocked ? 1 : 0.35);
      }

      if (isUnlocked && icon) {
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
    const currentId = saveData.mapState?.desertNode || saveData.currentLevel || "Wuestenruine";
    const startNode = NODES.find((node) => node.id === currentId) || NODES[0];
    this.currentNode = startNode;
    const isFemale = saveData.playerGender === "female";
    const standingTexture = isFemale ? "knight-female-standing" : "knight-standing";
    this.playerMarker = this.add.image(startNode.x, startNode.y + 2, standingTexture);
    this.playerMarker.setScale(0.42);
    this.playerMarker.setDepth(5);
    this.companionMarker = this.add.image(
      startNode.x - 18,
      startNode.y + 8,
      "companion-running"
    );
    this.companionMarker.setScale(0.42);
    this.companionMarker.setDepth(5);
    const showCompanion = this.equipped?.companion !== null;
    this.companionMarker.setVisible(showCompanion);

    if (this.entryFromUnderground && startNode.id === "Fremdweg") {
      const edgeY = Math.min(590, startNode.y + 90);
      const duration = this.getTravelDuration(edgeY, startNode.y + 2);
      this.playerMarker.setPosition(startNode.x, edgeY);
      this.companionMarker.setPosition(startNode.x - 18, edgeY + 8);
      this.isMoving = true;
      this.tweens.add({
        targets: this.playerMarker,
        x: startNode.x,
        y: startNode.y + 2,
        duration,
        onComplete: () => {
          this.isMoving = false;
          this.entryFromUnderground = false;
        },
      });
      if (this.companionMarker.visible) {
        this.tweens.add({
          targets: this.companionMarker,
          x: startNode.x - 18,
          y: startNode.y + 8,
          duration: duration + 40,
        });
      }
    }
  }

  createUI() {
    this.hintText = this.add
      .text(14, 585, "Pfeile/WASD = Bewegen, Enter = Start, Esc = Menü", {
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
      .text(940, 585, "Wüsten-Land", {
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
    if (this.isMoving || this.inventoryOpen || this.inventoryOverlay?.isOpen) return;
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
      const nextSave = {
        ...saveData,
        currentLevel: "UnderShop",
        mapState: {
          ...saveData.mapState,
          desertNode: this.currentNode.id,
        },
      };
      this.registry.set("saveData", nextSave);
      saveProgress(nextSave);
      const edgeY = Math.min(590, this.currentNode.y + 90);
      const duration = this.getTravelDuration(this.currentNode.y + 2, edgeY);
      this.isMoving = true;
      this.tweens.add({
        targets: this.playerMarker,
        x: this.currentNode.x,
        y: edgeY,
        duration,
        onComplete: () => {
          this.isMoving = false;
          this.scene.start("UndergroundMapScene", { fromDesert: true });
        },
      });
      if (this.companionMarker?.visible) {
        this.tweens.add({
          targets: this.companionMarker,
          x: this.currentNode.x - 18,
          y: edgeY + 8,
          duration: duration + 40,
        });
      }
      return;
    }

    if (left) this.tryMove({ x: -1, y: 0 });
    else if (right) this.tryMove({ x: 1, y: 0 });
    else if (up) this.tryMove({ x: 0, y: -1 });
    else if (down) this.tryMove({ x: 0, y: 1 });

    if (this.companionMarker?.visible) {
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
    if (this.companionMarker?.visible) {
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
      mapState: {
        ...saveData.mapState,
        desertNode: this.currentNode.id,
      },
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
    if (this.equipped?.consumable !== "honey") return;
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
    this.inventory.consumables.honey = result.count;
    if (result.count <= 0) {
      this.equipped.consumable = null;
    }
    this.hud.setConsumableEquipped(this.equipped?.consumable === "honey");
    const saveData = this.registry.get("saveData") || {};
    const nextSave = applyInventoryToSave(
      {
        ...saveData,
        health: this.health,
      },
      this.inventory,
      this.equipped
    );
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);
  }

  toggleInventory() {
    if (this.inventoryOpen) {
      this.closeInventory();
      return;
    }
    if (this.isMoving) return;
    this.openInventory();
  }

  openInventory() {
    if (!this.inventoryOverlay) return;
    this.inventoryOpen = true;
    this.inventoryOverlay.open(this.inventory, this.equipped);
  }

  closeInventory() {
    if (!this.inventoryOpen) return;
    this.inventoryOpen = false;
    this.inventoryOverlay?.close();
  }

  handleInventoryEquip(slot, itemId) {
    if (!this.equipped) return;
    if (slot === "weapon") {
      this.equipped.weapon = itemId;
      this.hud.setActiveEquipped(itemId === "sword");
    } else if (slot === "passive") {
      this.equipped.passive = itemId;
      this.hud.setPassiveOwned(itemId === "shield");
      this.hud.setShoesOwned(itemId === "shoes");
      this.hud.setPassiveEquipped(itemId);
    } else if (slot === "consumable") {
      this.equipped.consumable = itemId;
      this.hud.setConsumableEquipped(itemId === "honey");
    } else if (slot === "companion") {
      this.equipped.companion = itemId;
      if (this.companionMarker) {
        const showCompanion = itemId !== null;
        this.companionMarker.setVisible(showCompanion);
        if (showCompanion) {
          this.companionMarker.setPosition(
            this.playerMarker.x - 18,
            this.playerMarker.y + 12
          );
        }
      }
    }
    applyItemModeSupport(this.hud, this.equipped, this.gameMode);
    const saveData = this.registry.get("saveData") || {};
    const nextSave = applyInventoryToSave(saveData, this.inventory, this.equipped);
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
}
