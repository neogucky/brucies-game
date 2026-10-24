import { saveProgress, normalizeWorldProgress } from "../../saveManager.js";
import { playMusic } from "../../soundManager.js";
import { applyWeaponAppearance } from "../../utils/weapons.js";
import { applyInventoryToSave, normalizeInventory } from "../../utils/inventory.js";
import { applyItemModeSupport, GAME_MODES } from "../../utils/itemRegistry.js";
import TopHud from "../../ui/topHud.js";
import InventoryOverlay from "../../ui/InventoryOverlay.js";

export const JUNGLE_NODES = [
  { id: "UrwaldShop", label: "Urwald-Shop", x: 220, y: 360, neighbors: ["Urwaldkronen"] },
  { id: "Urwaldkronen", label: "Kokoskronen", x: 485, y: 230, neighbors: ["UrwaldShop", "Lianenpfad"] },
  { id: "Lianenpfad", label: "Lianenpfad", x: 760, y: 360, neighbors: ["Urwaldkronen"] },
];
const style = { fontFamily: "Trebuchet MS, sans-serif", color: "#fff2c9", stroke: "#183b25", strokeThickness: 4 };

export default class JungleMapScene extends Phaser.Scene {
  constructor() { super({ key: "JungleMapScene" }); this.travelSpeed = 260; }
  init(data) {
    this.entryFromUnderworld = Boolean(data?.fromUnderworld);
    // Phaser retains start data between visits; a world entry animation runs once.
    if (data) delete data.fromUnderworld;
  }

  create() {
    this.isMoving = false; this.inventoryOpen = false; this.gameMode = GAME_MODES.ISOMETRIC;
    const save = normalizeWorldProgress(this.registry.get("saveData") || {});
    if (!save.unlockedWorlds.includes("jungle")) { this.scene.start("UndergroundMapScene"); return; }
    this.unlocked = new Set(save.unlockedLevels);
    const requested = this.entryFromUnderworld ? "UrwaldShop" : save.mapState?.jungleNode;
    this.currentNode = JUNGLE_NODES.find(n => n.id === requested && this.unlocked.has(n.id)) || JUNGLE_NODES[0];
    const normalized = normalizeInventory(save);
    this.inventory = normalized.inventory; this.equipped = normalized.equipped;
    this.health = save.health ?? 5; this.maxHealth = 5;
    this.registry.set("saveData", save);
    this.add.image(480, 300, "worldmap-jungle-bg").setDisplaySize(960, 600).setDepth(-3);
    this.drawPaths(); this.createNodes(); this.createPlayerMarker(); this.createUI(save);
    this.saveLocation(); playMusic(this, "music-world");
    this.cursors = this.input.keyboard.createCursorKeys(); this.wasd = this.input.keyboard.addKeys("W,A,S,D");
    this.input.keyboard.on("keydown-ENTER", () => this.startCurrentLevel());
    this.input.keyboard.on("keydown-T", () => this.useConsumable());
    this.input.keyboard.on("keydown-ESC", () => {
      if (this.inventoryOpen) this.closeInventory(); else if (!this.isMoving) this.scene.start("MainMenuScene");
    });
    this.input.keyboard.on("keydown-TAB", () => this.toggleInventory());
    this.input.keyboard.on("keydown-F", () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen();
    });
    this.inventoryOverlay = new InventoryOverlay(this, {
      onEquip: (slot, id) => this.handleInventoryEquip(slot, id), onClose: () => this.closeInventory(),
    });
    this.events.once("shutdown", () => this.inventoryOverlay.destroy());
    if (this.entryFromUnderworld) {
      this.entryFromUnderworld = false;
      this.playerMarker.setPosition(30, this.currentNode.y + 6);
      this.companionMarker.setPosition(12, this.currentNode.y + 17);
      this.walkTo(this.currentNode);
    }
  }

  drawPaths() {
    const paths = this.add.graphics().setDepth(-1);
    paths.lineStyle(5, 0xb89557, .9);
    paths.lineBetween(0, 378, JUNGLE_NODES[0].x, JUNGLE_NODES[0].y + 18);
    JUNGLE_NODES.forEach(node => node.neighbors.forEach(id => {
      const next = JUNGLE_NODES.find(n => n.id === id);
      if (next.x <= node.x || !this.unlocked.has(node.id) || !this.unlocked.has(id)) return;
      paths.lineBetween(node.x, node.y + 18, next.x, next.y + 18);
    }));
  }

  createNodes() {
    this.nodeSprites = new Map();
    const completed = new Set(this.registry.get("saveData")?.completedLevels || []);
    JUNGLE_NODES.forEach(node => {
      const open = this.unlocked.has(node.id);
      this.add.ellipse(node.x, node.y + 14, 140, 46, 0xead58c, open ? .34 : .1).setDepth(0);
      let icon;
      if (node.id === "UrwaldShop") {
        icon = this.add.image(node.x, node.y - 15, "tavern-map").setDisplaySize(142, 115);
        this.add.image(node.x + 47, node.y + 5, "item-bow").setDisplaySize(37, 37).setDepth(3);
      } else {
        icon = this.add.image(node.x, node.y - 25, "jungle-tree").setDisplaySize(115, 148);
        this.add.image(node.x + 42, node.y - 16, node.id === "Urwaldkronen" ? "monkey-king" : "monkey-blue")
          .setDisplaySize(52, 58).setDepth(3).setAlpha(open ? 1 : .35);
      }
      icon.setDepth(2).setAlpha(open ? 1 : .35);
      this.nodeSprites.set(node.id, icon);
      const label = this.add.text(node.x, node.y + 58, node.label + (completed.has(node.id) ? " ✓" : ""),
        { ...style, fontSize: "21px" }).setOrigin(.5).setDepth(6);
      if (!open) this.add.text(node.x, node.y + 82, "Besiege zuerst den Affenkönig", { ...style, fontSize: "13px" })
        .setOrigin(.5).setDepth(6);
      const choose = () => {
        if (this.isMoving || this.inventoryOpen) return;
        if (!open) { this.showHint("Besiege zuerst den Affenkönig in Kokoskronen."); return; }
        if (this.currentNode.id === node.id) this.startCurrentLevel();
        else if (this.currentNode.neighbors.includes(node.id)) this.walkTo(node);
        else this.showHint("Folge dem Weg zum nächsten Ort.");
      };
      icon.setInteractive({ useHandCursor: true }).on("pointerdown", choose);
      label.setInteractive({ useHandCursor: true }).on("pointerdown", choose);
    });
    this.add.text(86, 420, "← Unterwelt", { ...style, fontSize: "19px" }).setOrigin(.5).setDepth(6)
      .setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        if (this.currentNode.id === "UrwaldShop") this.returnToUnderworld();
        else this.showHint("Der Rückweg beginnt beim Urwald-Shop.");
      });
  }

  createPlayerMarker() {
    const node = this.currentNode, female = this.registry.get("saveData")?.playerGender === "female";
    this.playerMarker = this.add.image(node.x, node.y + 6, female ? "knight-female-standing" : "knight-standing")
      .setScale(.46).setDepth(5);
    applyWeaponAppearance(this, this.playerMarker);
    this.companionMarker = this.add.image(node.x - 20, node.y + 17, "companion-running")
      .setScale(.46).setDepth(5).setVisible(Boolean(this.equipped.companion));
  }

  createUI(save) {
    this.hud = new TopHud(this, { coins: save.coins ?? 0, health: this.health, maxHealth: 5,
      consumables: this.inventory.consumables, activeEquipped: this.equipped.weapon,
      passiveOwned: this.equipped.passive === "shield", passiveShoes: this.equipped.passive === "shoes",
      passiveEquipped: this.equipped.passive, consumableEquipped: this.equipped.consumable === "honey",
      activeDisabled: true, showCompanion: true, companionHealth: this.equipped.companion ? 1 : 0 });
    applyItemModeSupport(this.hud, this.equipped, this.gameMode);
    this.add.text(18, 82, "DIE URWALDWELT", { ...style, fontFamily: "Georgia, serif", fontSize: "29px" }).setDepth(6);
    this.lockText = this.add.text(480, 518, "", { ...style, fontSize: "18px", align: "center",
      wordWrap: { width: 860 } }).setOrigin(.5).setDepth(8);
    this.locationText = this.add.text(940, 585, "Urwaldwelt", { ...style, fontSize: "16px" }).setOrigin(1, 1).setDepth(6);
    this.add.text(14, 585, "Pfeile / WASD: Bewegen · E / Enter: Betreten · I: Inventar · Q: Menü", {
      ...style, fontSize: "14px" }).setOrigin(0, 1).setDepth(6);
  }

  showHint(text) {
    this.lockText.setText(text); this.hintTimer?.remove(false);
    this.hintTimer = this.time.delayedCall(1800, () => this.lockText.setText(""));
  }

  saveLocation() {
    const save = this.registry.get("saveData") || {}, node = this.currentNode;
    const next = applyInventoryToSave({ ...save, currentWorld: "jungle", currentLevel: node.id, health: this.health,
      mapState: { ...save.mapState, jungleNode: node.id } }, this.inventory, this.equipped);
    this.registry.set("saveData", next); saveProgress(next);
    this.locationText?.setText("Urwaldwelt · " + node.label);
  }

  walkTo(node) {
    if (this.isMoving || this.inventoryOpen || !this.unlocked.has(node.id)) return;
    this.isMoving = true;
    const duration = Math.max(220, Math.hypot(node.x - this.playerMarker.x, node.y + 6 - this.playerMarker.y) / this.travelSpeed * 1000);
    this.tweens.add({ targets: this.playerMarker, x: node.x, y: node.y + 6, duration,
      onComplete: () => { this.currentNode = node; this.isMoving = false; this.saveLocation(); } });
    if (this.companionMarker.visible) this.tweens.add({ targets: this.companionMarker,
      x: node.x - 20, y: node.y + 17, duration });
  }

  tryMove(direction) {
    if (direction.x < 0 && this.currentNode.id === "UrwaldShop") { this.returnToUnderworld(); return; }
    let best, score = .25;
    this.currentNode.neighbors.forEach(id => {
      const node = JUNGLE_NODES.find(n => n.id === id), dx = node.x - this.currentNode.x, dy = node.y - this.currentNode.y;
      const dot = (dx * direction.x + dy * direction.y) / Math.hypot(dx, dy);
      if (dot > score) { best = node; score = dot; }
    });
    if (!best) return;
    if (!this.unlocked.has(best.id)) { this.showHint("Besiege zuerst den Affenkönig in Kokoskronen."); return; }
    this.walkTo(best);
  }

  startCurrentLevel() {
    if (this.isMoving || this.inventoryOpen || !this.unlocked.has(this.currentNode.id)) return;
    this.saveLocation();
    if (this.currentNode.id === "UrwaldShop") this.scene.start("JungleShopScene");
    else this.scene.start("JungleScene", { levelId: this.currentNode.id });
  }

  returnToUnderworld() {
    if (this.isMoving || this.inventoryOpen || this.currentNode.id !== "UrwaldShop") return;
    this.isMoving = true;
    const save = this.registry.get("saveData") || {};
    const next = { ...save, currentWorld: "underground", currentLevel: "Kristalltiefen",
      mapState: { ...save.mapState, undergroundNode: "Kristalltiefen", jungleNode: "UrwaldShop" } };
    this.registry.set("saveData", next); saveProgress(next);
    this.tweens.add({ targets: this.playerMarker, x: 0, y: this.currentNode.y + 6,
      duration: Math.max(220, this.playerMarker.x / this.travelSpeed * 1000),
      onComplete: () => this.scene.start("UndergroundMapScene", { fromJungle: true }) });
    if (this.companionMarker.visible) this.tweens.add({ targets: this.companionMarker, x: -20,
      y: this.currentNode.y + 17, duration: Math.max(220, this.companionMarker.x / this.travelSpeed * 1000) });
  }

  toggleInventory() { if (this.inventoryOpen) this.closeInventory(); else if (!this.isMoving) {
    this.inventoryOpen = true; this.inventoryOverlay.open(this.inventory, this.equipped);
  } }
  closeInventory() { this.inventoryOpen = false; this.inventoryOverlay?.close(); }
  handleInventoryEquip(slot, id) {
    this.equipped[slot] = id;
    if (slot === "weapon") applyWeaponAppearance(this, this.playerMarker);
    if (slot === "companion") this.companionMarker.setVisible(Boolean(id));
    this.hud.setActiveEquipped(this.equipped.weapon); this.hud.setPassiveEquipped(this.equipped.passive);
    this.hud.setPassiveOwned(this.equipped.passive === "shield"); this.hud.setShoesOwned(this.equipped.passive === "shoes");
    this.hud.setConsumableEquipped(this.equipped.consumable === "honey");
    applyItemModeSupport(this.hud, this.equipped, this.gameMode); this.saveLocation();
  }
  useConsumable() {
    if (this.isMoving || this.inventoryOpen || this.equipped.consumable !== "honey") return;
    const result = this.hud.tryUseHoney({ count: this.inventory.consumables.honey, health: this.health, maxHealth: 5,
      companionHealth: 1, companionRespawnAt: 0 });
    if (!result.consumed) return;
    this.health = result.health; this.inventory.consumables.honey = result.count;
    if (!result.count) this.equipped.consumable = null;
    this.hud.setConsumableEquipped(this.equipped.consumable === "honey"); this.saveLocation();
  }
  update() {
    if (this.isMoving || this.inventoryOpen || this.inventoryOverlay?.isOpen) return;
    const left = this.cursors.left.isDown || this.wasd.A.isDown, right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown, down = this.cursors.down.isDown || this.wasd.S.isDown;
    if (left) this.tryMove({ x: -1, y: 0 }); else if (right) this.tryMove({ x: 1, y: 0 });
    else if (up) this.tryMove({ x: 0, y: -1 }); else if (down) this.tryMove({ x: 0, y: 1 });
  }
}
