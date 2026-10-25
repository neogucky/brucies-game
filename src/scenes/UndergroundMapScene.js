import WorldMapTravel from "../utils/WorldMapTravel.js";
import { drawWorldMapPaths, mapFoot, WORLD_MAP_EXITS } from "../utils/worldMapRoutes.js";
import { applyWeaponAppearance } from "../utils/weapons.js";
import { saveProgress, normalizeWorldProgress } from "../saveManager.js";
import { playMusic } from "../soundManager.js";
import TopHud from "../ui/topHud.js";
import { applyItemModeSupport, GAME_MODES } from "../utils/itemRegistry.js";
import CoordinateDebugger from "../utils/coordinateDebugger.js";
import DialogManager from "../dialogManager.js";
import InventoryOverlay from "../ui/InventoryOverlay.js";
import { applyInventoryToSave, normalizeInventory } from "../utils/inventory.js";

const NODES = [
  {
    id: "UnderShop",
    label: "Händlerin",
    x: 445,
    y: 210,
    neighbors: { left: "UnderDig", downLeft: "Schluesseltor", right: "Unterweltexperte" },
  },
  {
    id: "UnderDig",
    label: "Erdgang",
    x: 192,
    y: 127,
    neighbors: { right: "UnderShop" },
  },
  {
    id: "Schluesseltor",
    label: "Schluesseltor",
    x: 338,
    y: 340,
    neighbors: { upRight: "UnderShop", left: "Schluesselweg", downRight: "Kristalltiefen" },
  },
  {
    id: "Schluesselweg",
    label: "Schluesselweg",
    x: 191,
    y: 307,
    neighbors: { right: "Schluesseltor" },
  },
  {
    id: "Kristalltiefen",
    label: "Kristalltiefen",
    x: 690,
    y: 450,
    neighbors: { upLeft: "Schluesseltor" },
  },
  { id: "Unterweltexperte", label: "Unterweltexperte", x: 685, y: 220, neighbors: { left: "UnderShop" } },
];

export default class UndergroundMapScene extends Phaser.Scene {
  constructor() {
    super({ key: "UndergroundMapScene" });
    this.currentNode = null;
    this.entryFromDesert = false;
    this.travelSpeed = 260;
    this.isMoving = false;
    this.isDialogOpen = false;
    this.inventoryOpen = false;
  }

  init(data) {
    this.entryFromDesert = Boolean(data?.fromDesert);
    this.entryFromJungle = Boolean(data?.fromJungle);
    if (data) { delete data.fromDesert; delete data.fromJungle; }
  }

  create() {
    this.isMoving = false;
    this.inventoryOpen = false;
    this.isDialogOpen = false;
    this.gameMode = GAME_MODES.ISOMETRIC;
    this.addBackground();
    this.ensureUnlocks();
    this.equipped = normalizeInventory(this.registry.get("saveData") || {}).equipped;
    this.createNodes();
    this.drawPaths();
    this.createPlayerMarker();
    this.createUI();
    playMusic(this, "music-world");

    const saveData = { ...this.registry.get("saveData"), currentWorld: "underground", currentLevel: this.currentNode.id };
    this.registry.set("saveData", saveData);
    saveProgress(saveData);
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
    const returnToDesert = () => {
      if (this.currentNode?.id === "UnderShop") {
        this.returnToDesert();
      }
    };
    this.input.keyboard.on("keydown-UP", returnToDesert);
    this.input.keyboard.on("keydown-W", returnToDesert);
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
        this.scene.start("MainMenuScene");
      }
    };
    this.input.keyboard.on("keydown", this.handleKeyDown);
    this.coordDebugger = new CoordinateDebugger(this);
    this.input.keyboard.on("keydown-F", () => this.toggleFullscreen());
    this.dialog = new DialogManager(this);
    this.events.once("shutdown", () => {
      if (this.handleKeyDown) {
        this.input.keyboard.off("keydown", this.handleKeyDown);
      }
    });
  }

  ensureUnlocks() {
    const saveData = normalizeWorldProgress(this.registry.get("saveData") || {});
    const unlocked = new Set(saveData.unlockedLevels || []);
    unlocked.add("UnderShop"); unlocked.add("Unterweltexperte"); unlocked.add("UnderDig"); unlocked.add("Schluesseltor");
    if (saveData.completedLevels?.includes("Schluesselweg")) unlocked.add("Kristalltiefen");
    const worlds = new Set(saveData.unlockedWorlds); worlds.add("underground");
    const nextSave = { ...saveData, unlockedLevels: [...unlocked], unlockedWorlds: [...worlds] };
    this.registry.set("saveData", nextSave); saveProgress(nextSave);
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
      const iconKey =
        node.id === "Unterweltexperte" ? "professor-underground" : node.id === "UnderShop"
          ? "underground-shop-map"
          : node.id === "Schluesseltor"
          ? isUnlocked && saveData.unlockedLevels?.includes("Schluesselweg")
            ? "worldmap-keytower-open"
            : "worldmap-keytower"
          : node.id === "UnderDig"
          ? "worldmap-underground-level"
          : node.id === "Schluesselweg"
          ? "worldmap-underground-molelevel"
          : "underground-stonemonster-standing";
      const iconScale =
        node.id === "UnderShop" ? 0.3 : node.id === "Schluesseltor" ? 0.5 : 0.26;
      const icon = this.add.image(node.x, node.y, iconKey).setScale(iconScale);
      if (node.id === "Unterweltexperte") {
        icon.setDisplaySize(90, 105);
        this.add.text(node.x, node.y + 65, node.label, { fontFamily: "Trebuchet MS, sans-serif", fontSize: "19px", color: "#fff0bf", stroke: "#3b2a17", strokeThickness: 4 })
          .setOrigin(.5).setDepth(4).setInteractive({ useHandCursor: true }).on("pointerdown", () => this.chooseNode(node));
      }
      icon.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.chooseNode(node));
      if (node.id === "Kristalltiefen") {
        icon.setTint(0xa9dcff);
        this.add.text(node.x, node.y + 44, "Kristalltiefen", {
          fontFamily: "Trebuchet MS, sans-serif", fontSize: "16px",
          color: isUnlocked ? "#e2f5ff" : "#999999", stroke: "#1d1920", strokeThickness: 3,
        }).setOrigin(0.5).setDepth(3);
      }
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
    const exits = [[NODES[0], WORLD_MAP_EXITS.underground.desert]];
    if (normalizeWorldProgress(this.registry.get("saveData") || {}).unlockedWorlds.includes("jungle")) {
      exits.push([NODES.find(n => n.id === "Kristalltiefen"), WORLD_MAP_EXITS.underground.jungle]);
    }
    this.pathGraphics = drawWorldMapPaths(this, "underground", NODES, exits);
  }

  travelToJungle() {
    if (this.currentNode?.id !== "Kristalltiefen" || this.isMoving || this.inventoryOpen || this.isDialogOpen) return;
    const save = normalizeWorldProgress(this.registry.get("saveData") || {});
    if (!save.unlockedWorlds.includes("jungle")) {
      this.lockText.setText("Besiege zuerst den Obsidian-Titan in den Kristalltiefen.");
      this.time.delayedCall(1800, () => this.lockText.setText(""));
      return;
    }
    this.isMoving = true;
    const nextSave = { ...save, currentWorld: "jungle", currentLevel: "UrwaldShop",
      mapState: { ...save.mapState, undergroundNode: "Kristalltiefen", jungleNode: "UrwaldShop" } };
    this.registry.set("saveData", nextSave); saveProgress(nextSave);
    this.mapTravel.travel(this.currentNode, WORLD_MAP_EXITS.underground.jungle, () => {
      this.scene.start("JungleMapScene", { fromUnderworld: true });
    });
  }

  createPlayerMarker() {
    const saveData = this.registry.get("saveData") || {};
    const currentId = saveData.mapState?.undergroundNode || saveData.currentLevel || "UnderShop";
    let startNode = NODES.find(node => node.id === currentId) || NODES[0];
    if (this.entryFromDesert) startNode = NODES.find(n => n.id === "UnderShop");
    if (this.entryFromJungle) startNode = NODES.find(n => n.id === "Kristalltiefen");
    this.currentNode = startNode;
    const foot = mapFoot(startNode);
    const standingTexture = saveData.playerGender === "female" ? "knight-female-standing" : "knight-standing";
    this.playerMarker = this.add.image(foot.x, foot.y, standingTexture).setOrigin(.5, 1).setScale(.46).setDepth(5);
    applyWeaponAppearance(this, this.playerMarker);
    this.companionMarker = this.add.image(foot.x - 28, foot.y, "companion-running")
      .setOrigin(.5, 1).setScale(.46).setDepth(5).setVisible(Boolean(this.equipped?.companion));
    this.mapTravel = new WorldMapTravel(this, "underground");
    if (this.entryFromDesert || this.entryFromJungle) {
      const exit = this.entryFromJungle ? WORLD_MAP_EXITS.underground.jungle : WORLD_MAP_EXITS.underground.desert;
      this.entryFromDesert = false; this.entryFromJungle = false;
      const edge = mapFoot(exit);
      this.playerMarker.setPosition(edge.x, edge.y);
      this.companionMarker.setPosition(edge.x - 28, edge.y);
      this.mapTravel.travel(exit, startNode);
    }
  }

  createUI() {
    this.hintText = this.add
      .text(14, 585, "{confirm} = Betreten · {move} = Bewegen · {back} = Menü", {
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
    const jungleOpen = this.registry.get("saveData")?.unlockedWorlds?.includes("jungle");
    if (jungleOpen) {
      const path = this.add.graphics().setDepth(-1);
      path.lineStyle(4, 0x9a7c56, 1); path.lineBetween(690, 468, 960, 468);
      this.add.text(850, 430, "Urwaldwelt →", { fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "20px", color: "#dbf5ae", stroke: "#173d29", strokeThickness: 4 })
        .setOrigin(.5).setDepth(6).setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          if (this.currentNode?.id === "Kristalltiefen") this.travelToJungle();
          else this.lockText.setText("Der Weg in die Urwaldwelt beginnt bei Kristalltiefen.");
        });
    }
    this.lockText = this.add
      .text(480, 520, "", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#6b2f26",
      })
      .setOrigin(0.5);
  }

  startCurrentLevel() {
    if (this.isMoving || this.inventoryOpen || this.isDialogOpen) return;
    if (!this.currentNode) return;
    const saveData = this.registry.get("saveData") || {};
    if (!this.unlocked.has(this.currentNode.id)) {
      return;
    }
    if (this.currentNode.id === "Schluesseltor") {
      if (!saveData.undergroundKeyCollected) {
        this.showDialog("Verschlossen!");
        return;
      }
      const unlocked = new Set(saveData.unlockedLevels || []);
      if (!unlocked.has("Schluesselweg")) {
        unlocked.add("Schluesselweg");
        const nextSave = {
          ...saveData,
          unlockedLevels: Array.from(unlocked),
        };
        this.registry.set("saveData", nextSave);
        saveProgress(nextSave);
        this.sound.play("sfx-key-open");
        this.showDialog("Du hast das Tor aufgeschlossen!");
      } else {
        this.showDialog("Der Schluesselturm ist bereits geöffnet!");
      }
      return;
    }
    const nextSave = {
      ...saveData,
      currentLevel: this.currentNode.id,
      mapState: {
        ...saveData.mapState,
        undergroundNode: this.currentNode.id,
      },
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);
    if (this.currentNode.id === "Unterweltexperte") {
      this.scene.start("ExpertScene", { world: "underground" });
    } else if (this.currentNode.id === "UnderShop") {
      this.scene.start("UndergroundShopScene");
    } else if (this.currentNode.id === "UnderDig") {
      this.scene.start("UndergroundDigScene", {
        mapKey: "underground-dig-map",
        levelId: "UnderDig",
        locationName: "Untergrundpfad",
      });
    } else if (this.currentNode.id === "Schluesselweg") {
      this.scene.start("UndergroundDigScene", {
        mapKey: "underground-keytower-map",
        levelId: "Schluesselweg",
        locationName: "Schluesselweg",
      });
    } else if (this.currentNode.id === "Kristalltiefen") {
      this.scene.start("UndergroundDigScene", {
        mapKey: "underground-crystal-map", levelId: "Kristalltiefen", locationName: "Kristalltiefen",
      });
    }
  }

  returnToDesert() {
    if (!this.currentNode || this.isMoving || this.inventoryOpen || this.isDialogOpen) return;
    this.isMoving = true;
    const saveData = this.registry.get("saveData") || {};
    const desertNode = saveData.mapState?.desertNode ?? "Fremdweg";
    const nextSave = {
      ...saveData,
      currentWorld: "desert", currentLevel: desertNode,
      mapState: {
        ...saveData.mapState,
        undergroundNode: this.currentNode?.id ?? saveData.mapState?.undergroundNode,
      },
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);
    this.mapTravel.travel(this.currentNode, WORLD_MAP_EXITS.underground.desert, () => {
      this.scene.start("DessertMapScene", { fromUnderground: true });
    });
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
    if (this.isMoving || this.isDialogOpen) return;
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


  update() {
    if (this.isMoving || this.isDialogOpen || this.inventoryOpen || this.inventoryOverlay?.isOpen) return;
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    if (right && this.currentNode?.id === "Kristalltiefen") {
      this.travelToJungle(); return;
    }
    if (up && this.currentNode?.id === "UnderShop") {
      this.returnToDesert();
      return;
    }
    if (up && this.currentNode?.id === "Schluesseltor") {
      this.tryMove({ x: 1, y: -1 });
      return;
    }

    if (left) this.tryMove({ x: -1, y: 0 });
    else if (right) this.tryMove({ x: 1, y: 0 });
    else if (up) this.tryMove({ x: 0, y: -1 });
    else if (down) this.tryMove({ x: 0, y: 1 });

  }

  showDialog(text, onClose) {
    if (!this.dialog) return;
    this.isDialogOpen = true;
    this.dialog.show([{ text }], "middle", {
      onClose: () => {
        this.isDialogOpen = false;
        if (onClose) onClose();
      },
    });
  }

  tryMove(direction) {
    const nextId = this.getNeighborForDirection(direction);
    if (!nextId) return;
    if (!this.unlocked.has(nextId)) {
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
}
