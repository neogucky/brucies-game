import WorldMapTravel from "../utils/WorldMapTravel.js";
import WorldMapDiscovery from '../utils/WorldMapDiscovery.js';
import { startPendingDragonClue } from '../utils/dragonStory.js';
import { addWorldMapMarker } from "../utils/worldMapMarkers.js";
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
    label: "Taverne",
    x: 570,
    y: 130,
    neighbors: { left: "UnderDig", downLeft: "Schluesseltor", right: "Unterweltexperte" },
  },
  {
    id: "UnderDig",
    label: "Lehmhöhle",
    x: 185,
    y: 130,
    neighbors: { right: "UnderShop", down: 'Kristallschatz' },
  },
  {
    id: "Schluesseltor",
    label: "Schlüsseltor",
    x: 385,
    y: 236,
    walkAnchor: { x: 470, y: 242 }, markerOffsetY: 54, labelOffsetY: 82,
    neighbors: { upRight: "UnderShop", downLeft: "Schluesselweg" },
  },
  {
    id: "Schluesselweg",
    label: "Mine",
    x: 205,
    y: 383,
    neighbors: { upRight: "Schluesseltor", right: "Kristalltiefen" },
  },
  {
    id: "Kristalltiefen",
    label: "Kristalltiefen",
    x: 705,
    y: 436,
    neighbors: { left: "Schluesselweg" },
  },
  { id: "Unterweltexperte", label: "Unterweltexperte", x: 755, y: 125, neighbors: { left: "UnderShop" } },
  { id: 'Kristallschatz', label: 'Funkelkammer', x: 100, y: 270, bonusWorld: 'underground', neighbors: { up: 'UnderDig' } },
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
    const progress = normalizeWorldProgress(this.registry.get('saveData') || {});
    if (!progress.unlockedWorlds.includes('underground')) { this.scene.start('MainMenuScene'); return; }
    if (startPendingDragonClue(this, 'underground')) return;
    this.isMoving = false;
    this.inventoryOpen = false;
    this.isDialogOpen = false;
    this.gameMode = GAME_MODES.ISOMETRIC;
    this.addBackground();
    this.ensureUnlocks();
    if (!NODES.some(n => this.registry.get('saveData').unlockedLevels.includes(n.id))) { this.scene.start('MainMenuScene'); return; }
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
    this.mapDiscovery = new WorldMapDiscovery(this, 'underground', NODES, this.mapExits);
    this.mapDiscovery.watchExit('@desert', [this.desertExitLabel]);
    if (this.jungleExitLabel) this.mapDiscovery.watchExit('@jungle', [this.jungleExitLabel]);
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
    const nextSave = normalizeWorldProgress({ ...saveData, unlockedLevels: [...unlocked], unlockedWorlds: [...worlds] });
    this.registry.set("saveData", nextSave); saveProgress(nextSave);
  }

  addBackground() {
    const bg = this.add.image(480, 300, "worldmap-underground-bg").setDisplaySize(960, 600);
    bg.setDepth(-2);
  }

  createNodes() {
    const saveData = this.registry.get("saveData") || {};
    this.unlocked = new Set(saveData.unlockedLevels || []);
    this.nodeSprites = new Map();
    const keys = { UnderShop: "map-underground-shop", UnderDig: "map-underground-dig",
      Schluesseltor: this.unlocked.has("Schluesselweg") ? "map-underground-open-gate" : "map-underground-gate",
      Schluesselweg: "map-underground-dig", Kristalltiefen: "map-underground-depths",
      Unterweltexperte: "map-underground-expert", Kristallschatz: 'map-underground-depths' };
    NODES.forEach(node => {
      const marker = addWorldMapMarker(this, "underground", node, keys[node.id], () => this.chooseNode(node));
      if (node.id === "Schluesselweg") {
        marker.extras.push(this.add.image(node.x + 45, node.y - 46, "underground-stonemonster-standing")
          .setDisplaySize(51, 51).setDepth(3).setVisible(this.unlocked.has(node.id)));
      }
      this.nodeSprites.set(node.id, marker);
    });
  }

  drawPaths() {
    const save = normalizeWorldProgress(this.registry.get('saveData') || {});
    const exits = save.unlockedWorlds.includes('desert') ? [[NODES[0], WORLD_MAP_EXITS.underground.desert]] : [];
    if (save.unlockedWorlds.includes("jungle")) {
      exits.push([NODES.find(n => n.id === "Kristalltiefen"), WORLD_MAP_EXITS.underground.jungle]);
    }
    this.mapExits = exits;
    this.pathGraphics = drawWorldMapPaths(this, "underground", NODES, exits);
  }

  travelToJungle() {
    if (this.isRevealingMap || this.currentNode?.id !== "Kristalltiefen" || this.isMoving || this.inventoryOpen || this.isDialogOpen) return;
    const save = normalizeWorldProgress(this.registry.get("saveData") || {});
    if (!save.unlockedWorlds.includes("jungle")) {
      this.lockText.setText("Besiege zuerst den Obsidian-Titan in den Kristalltiefen.");
      this.time.delayedCall(1800, () => this.lockText.setText(""));
      return;
    }
    this.isMoving = true;
    const nextSave = { ...save, currentWorld: "jungle", currentLevel: "Urwaldkronen",
      mapState: { ...save.mapState, undergroundNode: "Kristalltiefen", jungleNode: "Urwaldkronen" } };
    this.registry.set("saveData", nextSave); saveProgress(nextSave);
    this.mapTravel.travel(this.currentNode, WORLD_MAP_EXITS.underground.jungle, () => {
      this.scene.start("JungleMapScene", { fromUnderworld: true });
    });
  }

  createPlayerMarker() {
    const saveData = this.registry.get("saveData") || {};
    const currentId = saveData.mapState?.undergroundNode || saveData.currentLevel || "UnderShop";
    let startNode = NODES.find(node => node.id === currentId && this.unlocked.has(node.id)) || NODES.find(node => this.unlocked.has(node.id));
    if (this.entryFromDesert && this.unlocked.has('UnderShop')) startNode = NODES.find(n => n.id === "UnderShop");
    if (this.entryFromJungle && this.unlocked.has('Kristalltiefen')) startNode = NODES.find(n => n.id === "Kristalltiefen");
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
    this.desertExitLabel = this.add.text(464, 95, "↑ Wüste", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "19px",
      color: "#fff0c0", stroke: "#38291e", strokeThickness: 4 }).setOrigin(.5).setDepth(6)
      .setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        if (this.currentNode?.id === "UnderShop") this.returnToDesert();
        else this.lockText.setText("Der Weg zur Wüste beginnt bei der Taverne.");
      });
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
    this.jungleExitLabel = null;
    if (jungleOpen) {
      this.jungleExitLabel = this.add.text(850, 430, "Urwaldwelt →", { fontFamily: "Trebuchet MS, sans-serif",
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
    if (this.isRevealingMap || this.isMoving || this.inventoryOpen || this.isDialogOpen) return;
    if (!this.currentNode) return;
    const saveData = this.registry.get("saveData") || {};
    if (!this.unlocked.has(this.currentNode.id)) {
      return;
    }
    if (this.currentNode.id === "Schluesseltor") {
      if (saveData.unlockedLevels?.includes('Schluesselweg')) {
        this.showDialog('Das Tor ist offen. Folge dem Weg zur Mine.'); return;
      }
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
        this.unlocked = unlocked;
        this.nodeSprites?.get('Schluesseltor')?.icon.setTexture('map-underground-open-gate');
        this.sound.play("sfx-key-open");
        this.showDialog("Du hast das Tor aufgeschlossen!", () => this.mapDiscovery?.refresh());
      } else {
        this.showDialog("Das Schlüsseltor ist bereits geöffnet!");
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
    if (this.currentNode.id === 'Kristallschatz') {
      this.scene.start('CoinChallengeScene', { world: 'underground' });
    } else if (this.currentNode.id === "Unterweltexperte") {
      this.scene.start("ExpertScene", { world: "underground" });
    } else if (this.currentNode.id === "UnderShop") {
      this.scene.start("UndergroundShopScene");
    } else if (this.currentNode.id === "UnderDig") {
      this.scene.start("UndergroundDigScene", {
        mapKey: "underground-dig-map",
        levelId: "UnderDig",
        locationName: "Lehmhöhle",
      });
    } else if (this.currentNode.id === "Schluesselweg") {
      this.scene.start("UndergroundDigScene", {
        mapKey: "underground-keytower-map",
        levelId: "Schluesselweg",
        locationName: "Mine",
      });
    } else if (this.currentNode.id === "Kristalltiefen") {
      this.scene.start("UndergroundDigScene", {
        mapKey: "underground-crystal-map", levelId: "Kristalltiefen", locationName: "Kristalltiefen",
      });
    }
  }

  returnToDesert() {
    if (this.isRevealingMap) return;
    if (!this.currentNode || this.isMoving || this.inventoryOpen || this.isDialogOpen) return;
    if (this.registry.get('saveData')?.debugProgress?.worlds?.desert === false) return;
    this.isMoving = true;
    const saveData = this.registry.get("saveData") || {};
    const desertNode = "Fremdweg";
    const nextSave = {
      ...saveData,
      currentWorld: "desert", currentLevel: desertNode,
      mapState: {
        ...saveData.mapState,
        desertNode,
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
    if (this.isRevealingMap || this.isMoving || this.isDialogOpen || this.inventoryOpen || this.inventoryOverlay?.isOpen) return;
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
    if (this.isRevealingMap) return;
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
    if (this.isRevealingMap || this.isMoving || this.inventoryOpen || this.isDialogOpen) return;
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
