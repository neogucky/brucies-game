import WorldMapTravel from "../utils/WorldMapTravel.js";
import { addWorldMapMarker } from "../utils/worldMapMarkers.js";
import { drawWorldMapPaths, mapFoot, WORLD_MAP_EXITS } from "../utils/worldMapRoutes.js";
import { applyWeaponAppearance } from "../utils/weapons.js";
import { saveProgress, isWorldUnlocked } from "../saveManager.js";
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
    neighbors: { right: "Taverne", up: "Wuestenexperte" },
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
  { id: "Wuestenexperte", label: "Wüstenexperte", x: 195, y: 290, neighbors: { down: "Wuestenruine" } },
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
    if (data) delete data.fromUnderground;
  }

  create() {
    this.isMoving = false;
    this.inventoryOpen = false;
    this.gameMode = GAME_MODES.ISOMETRIC;
    this.addBackground();
    this.ensureUnlocks();
    this.equipped = normalizeInventory(this.registry.get("saveData") || {}).equipped;
    this.createNodes();
    this.drawPaths();
    this.createPlayerMarker();
    this.createUI();
    playMusic(this, "music-world");
    const saveData = { ...this.registry.get("saveData"), currentWorld: "desert", currentLevel: this.currentNode.id };
    this.registry.set("saveData", saveData); saveProgress(saveData);
    const normalized = normalizeInventory(saveData);
    this.inventory = normalized.inventory;
    this.equipped = normalized.equipped;
    applyWeaponAppearance(this, this.playerMarker);
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
      passiveOwned: Boolean(this.equipped?.shield || this.equipped?.passive === "shield"),
      passiveShoes: Boolean(this.equipped?.shoes || this.equipped?.passive === "shoes"),
      activeEquipped: this.equipped.weapon,
      passiveEquipped: this.equipped.passive,
      consumableEquipped: this.equipped.consumable === "honey",
      activeDisabled: true,
      showCompanion: true,
      companionHealth: 1,
      companionRespawnRatio: 0,
      keyCollected: Boolean(normalizedSave.undergroundKeyCollected),
    });
    this.hud.setActiveEquipped(this.equipped.weapon);
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
    unlocked.add("Wuestenexperte");
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
    const save = this.registry.get("saveData") || {};
    const exit = NODES.find(n => n.id === "Fremdweg");
    const exits = this.unlocked.has(exit.id) && isWorldUnlocked(save, "underground")
      ? [[exit, WORLD_MAP_EXITS.desert.underground]] : [];
    this.pathGraphics = drawWorldMapPaths(this, "desert", NODES, exits);
  }

  createNodes() {
    const saveData = this.registry.get("saveData") || {};
    this.unlocked = new Set(saveData.unlockedLevels || []);
    this.nodeSprites = new Map();
    const keys = { Wuestenruine: "map-desert-ruin", Taverne: "map-desert-shop",
      DesertEndless: "map-desert-oasis", Wuestenexperte: "map-desert-expert",
      Fremdweg: isWorldUnlocked(saveData, "underground") ? "map-desert-tunnel" : "map-desert-quarry" };
    NODES.forEach(node => {
      const marker = addWorldMapMarker(this, "desert", node, keys[node.id], () => this.chooseNode(node));
      this.nodeSprites.set(node.id, marker);
      if (node.id === "Wuestenruine" && saveData.completedLevels?.includes(node.id) && !saveData.repairedRuinShown) {
        this.animateRepairedRuin(marker.icon);
        const nextSave = { ...saveData, repairedRuinShown: true };
        this.registry.set("saveData", nextSave); saveProgress(nextSave);
      }
    });
  }

  createPlayerMarker() {
    const saveData = this.registry.get("saveData") || {};
    const currentId = saveData.mapState?.desertNode || saveData.currentLevel || "Wuestenruine";
    let startNode = NODES.find(node => node.id === currentId) || NODES[0];
    this.currentNode = startNode;
    const foot = mapFoot(startNode);
    const standingTexture = saveData.playerGender === "female" ? "knight-female-standing" : "knight-standing";
    this.playerMarker = this.add.image(foot.x, foot.y, standingTexture).setOrigin(.5, 1).setScale(.42).setDepth(5);
    applyWeaponAppearance(this, this.playerMarker);
    this.companionMarker = this.add.image(foot.x - 28, foot.y, "companion-running")
      .setOrigin(.5, 1).setScale(.42).setDepth(5).setVisible(Boolean(this.equipped?.companion));
    this.mapTravel = new WorldMapTravel(this, "desert");
    if (this.entryFromUnderground && startNode.id === "Fremdweg") {
      const exit = WORLD_MAP_EXITS.desert.underground, edge = mapFoot(exit);
      this.playerMarker.setPosition(edge.x, edge.y);
      this.companionMarker.setPosition(edge.x - 28, edge.y);
      this.mapTravel.travel(exit, startNode, () => { this.entryFromUnderground = false; });
    }
  }

  createUI() {
    if (isWorldUnlocked(this.registry.get("saveData") || {}, "underground")) {
      this.add.text(835, 548, "Unterwelt ↓", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "19px",
        color: "#fff0c0", stroke: "#49301d", strokeThickness: 4 }).setOrigin(.5).setDepth(6)
        .setInteractive({ useHandCursor: true }).on("pointerdown", () => this.travelToUnderground());
    }
    this.hintText = this.add
      .text(14, 585, "{move} = Bewegen · {confirm} = Start · {back} = Menü", {
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
      this.travelToUnderground();
      return;
    }

    if (left) this.tryMove({ x: -1, y: 0 });
    else if (right) this.tryMove({ x: 1, y: 0 });
    else if (up) this.tryMove({ x: 0, y: -1 });
    else if (down) this.tryMove({ x: 0, y: 1 });

  }

  travelToUnderground() {
    if (this.isMoving || this.inventoryOpen || this.inventoryOverlay?.isOpen) return;
    if (this.currentNode?.id !== "Fremdweg") {
      this.lockText.setText("Der Weg zur Unterwelt beginnt beim Fremdweg."); return;
    }
    const saveData = this.registry.get("saveData") || {};
    if (!isWorldUnlocked(saveData, "underground")) {
      this.lockText.setText("Der Weg nach unten ist noch versperrt.");
      this.time.delayedCall(1000, () => this.lockText.setText("")); return;
    }
    const nextSave = { ...saveData, currentWorld: "underground", currentLevel: "UnderShop",
      mapState: { ...saveData.mapState, desertNode: "Fremdweg", undergroundNode: "UnderShop" } };
    this.registry.set("saveData", nextSave); saveProgress(nextSave);
    this.mapTravel.travel(this.currentNode, WORLD_MAP_EXITS.desert.underground, () => {
      this.scene.start("UndergroundMapScene", { fromDesert: true });
    });
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
    this.mapTravel.travel(this.currentNode, nextNode, () => {
      this.currentNode = nextNode;
    });
  }

  chooseNode(node) {
    if (this.isMoving || this.inventoryOpen || this.isDialogOpen) return;
    if (this.currentNode.id === node.id) { this.startCurrentLevel(); return; }
    if (!Object.values(this.currentNode.neighbors || {}).includes(node.id)) return;
    const dx = node.x - this.currentNode.x, dy = node.y - this.currentNode.y, length = Math.hypot(dx, dy);
    this.tryMove({ x: dx / length, y: dy / length });
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
    if (this.isMoving || this.inventoryOpen) return;
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

    if (this.currentNode.id === "Wuestenexperte") {
      this.scene.start("ExpertScene", { world: "desert" });
    } else if (this.currentNode.id === "Wuestenruine") {
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
      applyWeaponAppearance(this, this.player || this.playerMarker);
      this.hud.setActiveEquipped(itemId);
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
            this.playerMarker.x - 28,
            this.playerMarker.y
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

}
