import WorldMapTravel from "../../utils/WorldMapTravel.js";
import { addWorldMapMarker } from "../../utils/worldMapMarkers.js";
import { drawWorldMapPaths, mapFoot, WORLD_MAP_EXITS, JUNGLE_PATH_PORTS } from "../../utils/worldMapRoutes.js";
import { saveProgress, normalizeWorldProgress } from "../../saveManager.js";
import { playMusic } from "../../soundManager.js";
import { applyWeaponAppearance } from "../../utils/weapons.js";
import { applyInventoryToSave, normalizeInventory } from "../../utils/inventory.js";
import { applyItemModeSupport, GAME_MODES } from "../../utils/itemRegistry.js";
import TopHud from "../../ui/topHud.js";
import InventoryOverlay from "../../ui/InventoryOverlay.js";

export const JUNGLE_NODES = [
  { id: "Urwaldkronen", label: "Kokoskronen", x: 245, y: 350, neighbors: ["UrwaldShop", "Urwaldexperte"] },
  { id: "UrwaldShop", label: "Urwald-Shop", x: 485, y: 230, neighbors: ["Urwaldkronen", "Lianenpfad"] },
  { id: "Lianenpfad", label: "Lianenpfad", x: 760, y: 360, neighbors: ["UrwaldShop"] },
  { id: "Urwaldexperte", label: "Urwaldexperte", x: 485, y: 450, neighbors: ["Urwaldkronen"] },
];

export function jungleMapUnlocks(save, testing = false) {
  const unlocked = new Set(save.unlockedLevels || []);
  unlocked.add('Urwaldkronen'); unlocked.add('Urwaldexperte');
  if (!testing && !save.completedLevels?.includes('Urwaldkronen')) {
    unlocked.delete('UrwaldShop'); unlocked.delete('Lianenpfad');
  } else { unlocked.add('UrwaldShop'); unlocked.add('Lianenpfad'); }
  return unlocked;
}
const style = { fontFamily: "Trebuchet MS, sans-serif", color: "#fff2c9", stroke: "#183b25", strokeThickness: 4 };

export default class JungleMapScene extends Phaser.Scene {
  constructor(key = 'JungleMapScene') { super({ key }); this.travelSpeed = 260; }
  init(data) {
    this.entryFromUnderworld = Boolean(data?.fromUnderworld);
    this.entryFromWater = Boolean(data?.fromWater);
    // Phaser retains start data between visits; a world entry animation runs once.
    if (data) { delete data.fromUnderworld; delete data.fromWater; }
  }

  create() {
    this.isMoving = false; this.inventoryOpen = false; this.gameMode = GAME_MODES.ISOMETRIC;
    const save = normalizeWorldProgress(this.registry.get("saveData") || {});
    if (!save.unlockedWorlds.includes("jungle")) { this.scene.start("UndergroundMapScene"); return; }
    this.unlocked = jungleMapUnlocks(save, this.registry.get('unlockAllForTesting') === true);
    const requested = this.entryFromUnderworld ? "Urwaldkronen" : this.entryFromWater ? 'Lianenpfad' : save.mapState?.jungleNode;
    this.currentNode = JUNGLE_NODES.find(n => n.id === requested && this.unlocked.has(n.id)) || JUNGLE_NODES[0];
    const normalized = normalizeInventory(save);
    this.inventory = normalized.inventory; this.equipped = normalized.equipped;
    this.health = save.health ?? 5; this.maxHealth = 5;
    this.registry.set("saveData", save);
    this.add.image(480, 300, "worldmap-jungle-bg").setDisplaySize(960, 600).setDepth(-3);
    this.drawPaths(); this.createNodes(); this.createPlayerMarker(); this.createUI(save);
    if (!this.unlocked.has('UrwaldShop')) this.createCanopyBarrier();
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
    if (this.entryFromUnderworld || this.entryFromWater) {
      const exit = this.entryFromWater ? WORLD_MAP_EXITS.jungle.water : WORLD_MAP_EXITS.jungle.underground, edge = mapFoot(exit);
      this.entryFromUnderworld = false; this.entryFromWater = false;
      this.playerMarker.setPosition(edge.x, edge.y);
      this.companionMarker.setPosition(edge.x - 28, edge.y);
      this.mapTravel.travel(exit, this.currentNode);
    }
  }

  drawPaths() {
    const exits = [[JUNGLE_NODES[0], WORLD_MAP_EXITS.jungle.underground]];
    if (this.unlocked.has('Lianenpfad')) exits.push([JUNGLE_NODES[2], WORLD_MAP_EXITS.jungle.water]);
    this.pathGraphics = drawWorldMapPaths(this, 'jungle', JUNGLE_NODES, exits);
  }

  createCanopyBarrier() {
    const barrier = this.add.graphics().setDepth(4);
    barrier.lineStyle(11, 0x4d331e).lineBetween(359, 367, 381, 395);
    barrier.lineStyle(7, 0xa17542).lineBetween(359, 367, 381, 395);
    barrier.lineStyle(3, 0x488640).lineBetween(357, 377, 379, 383).lineBetween(361, 389, 380, 378);
    barrier.fillStyle(0x68a342).fillEllipse(359, 377, 14, 6).fillEllipse(379, 387, 12, 6);
    this.add.zone(370, 382, 50, 50).setDepth(6).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.showHint('Besiege zuerst den Affenkönig in Kokoskronen.'));
  }

  createNodes() {
    this.nodeSprites = new Map();
    const keys = { Urwaldexperte: "map-jungle-expert", UrwaldShop: "map-jungle-shop",
      Urwaldkronen: "map-jungle-canopy", Lianenpfad: "map-jungle-vines" };
    JUNGLE_NODES.forEach(node => {
      const open = this.unlocked.has(node.id);
      const choose = () => {
        if (this.isMoving || this.inventoryOpen) return;
        if (!open) { this.showHint("Besiege zuerst den Affenkönig in Kokoskronen."); return; }
        if (this.currentNode.id === node.id) this.startCurrentLevel();
        else if (this.currentNode.neighbors.includes(node.id)) this.walkTo(node);
        else this.showHint("Folge dem Weg zum nächsten Ort.");
      };
      const marker = addWorldMapMarker(this, "jungle", node, keys[node.id], choose);
      this.nodeSprites.set(node.id, marker);
    });
    this.add.text(86, 287, "Unterwelt", { ...style, fontSize: "18px" }).setOrigin(.5).setDepth(6)
      .setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        if (this.currentNode.id === "Urwaldkronen") this.returnToUnderworld();
        else this.showHint("Der Rückweg beginnt bei Kokoskronen.");
      });
    this.add.zone(73, 244, 105, 92).setDepth(6).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { if (this.currentNode.id === 'Urwaldkronen') this.returnToUnderworld(); else this.showHint('Der Höhlenweg beginnt bei Kokoskronen.'); });
    if (this.unlocked.has('Lianenpfad')) this.add.text(877, 443, 'Urwaldsee →', { ...style, fontSize: '19px' })
      .setOrigin(.5).setDepth(6).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (this.currentNode.id === 'Lianenpfad') this.travelToWater(); else this.showHint('Vom Lianenpfad führt der Weg zum Urwaldsee.');
      });
  }

  createPlayerMarker() {
    const foot = mapFoot(this.currentNode), female = this.registry.get("saveData")?.playerGender === "female";
    this.playerMarker = this.add.image(foot.x, foot.y, female ? "knight-female-standing" : "knight-standing")
      .setOrigin(.5, 1).setScale(.46).setDepth(5);
    applyWeaponAppearance(this, this.playerMarker);
    this.companionMarker = this.add.image(foot.x - 28, foot.y, "companion-running")
      .setOrigin(.5, 1).setScale(.46).setDepth(5).setVisible(Boolean(this.equipped.companion));
    this.mapTravel = new WorldMapTravel(this, "jungle");
  }

  createUI(save) {
    this.hud = new TopHud(this, { coins: save.coins ?? 0, health: this.health, maxHealth: 5,
      consumables: this.inventory.consumables, activeEquipped: this.equipped.weapon,
      passiveOwned: Boolean(this.equipped?.shield || this.equipped?.passive === "shield"), passiveShoes: Boolean(this.equipped?.shoes || this.equipped?.passive === "shoes"),
      passiveEquipped: this.equipped.passive, consumableEquipped: this.equipped.consumable === "honey",
      activeDisabled: true, showCompanion: true, companionHealth: this.equipped.companion ? 1 : 0 });
    applyItemModeSupport(this.hud, this.equipped, this.gameMode);
    this.lockText = this.add.text(480, 518, "", { ...style, fontSize: "18px", align: "center",
      wordWrap: { width: 860 } }).setOrigin(.5).setDepth(8);
    this.locationText = this.add.text(940, 585, "Urwaldwelt", { ...style, fontSize: "16px" }).setOrigin(1, 1).setDepth(6);
    this.hintText = this.add.text(14, 585, "{move}: Bewegen · {confirm}: Betreten", {
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
    this.locationText?.setText("Urwaldwelt");
  }

  walkTo(node) {
    if (this.isMoving || this.inventoryOpen || !this.unlocked.has(node.id)) return;
    this.mapTravel.travel(this.currentNode, node, () => {
      this.currentNode = node; this.saveLocation();
    });
  }

  tryMove(direction) {
    if (direction.x < 0 && this.currentNode.id === "Urwaldkronen") { this.returnToUnderworld(); return; }
    if (direction.x > 0 && this.currentNode.id === 'Lianenpfad') { this.travelToWater(); return; }
    const directionKey = direction.x > 0 ? 'right' : direction.x < 0 ? 'left' : direction.y > 0 ? 'down' : 'up';
    const id = Object.entries(JUNGLE_PATH_PORTS[this.currentNode.id] || {}).find(([, port]) => port === directionKey)?.[0];
    const best = JUNGLE_NODES.find(n => n.id === id);
    if (!best) return;
    if (!this.unlocked.has(best.id)) { this.showHint("Besiege zuerst den Affenkönig in Kokoskronen."); return; }
    this.walkTo(best);
  }

  startCurrentLevel() {
    if (this.isMoving || this.inventoryOpen || !this.unlocked.has(this.currentNode.id)) return;
    this.saveLocation();
    if (this.currentNode.id === "UrwaldShop") this.scene.start("JungleShopScene");
    else if (this.currentNode.id === "Urwaldexperte") this.scene.start("ExpertScene", { world: "jungle" });
    else this.scene.start("JungleScene", { levelId: this.currentNode.id });
  }

  returnToUnderworld() {
    if (this.isMoving || this.inventoryOpen || this.currentNode.id !== "Urwaldkronen") return;
    this.isMoving = true;
    const save = this.registry.get("saveData") || {};
    const next = { ...save, currentWorld: "underground", currentLevel: "Kristalltiefen",
      mapState: { ...save.mapState, undergroundNode: "Kristalltiefen", jungleNode: "Urwaldkronen" } };
    this.registry.set("saveData", next); saveProgress(next);
    this.mapTravel.travel(this.currentNode, WORLD_MAP_EXITS.jungle.underground, () => {
      this.scene.start("UndergroundMapScene", { fromJungle: true });
    });
  }

  travelToWater() {
    if (this.isMoving || this.inventoryOpen || this.currentNode.id !== 'Lianenpfad') return;
    this.isMoving = true;
    const save = this.registry.get('saveData') || {};
    const next = { ...save, currentWorld: 'water', currentLevel: 'Seeufer',
      unlockedWorlds: [...new Set([...(save.unlockedWorlds || []), 'water'])],
      mapState: { ...save.mapState, jungleNode: 'Lianenpfad', waterNode: 'Seeufer' } };
    this.registry.set('saveData', next); saveProgress(next);
    this.mapTravel.travel(this.currentNode, WORLD_MAP_EXITS.jungle.water, () => this.scene.start('WaterMapScene', { fromJungle: true }));
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
    this.hud.setPassiveOwned(Boolean(this.equipped?.shield || this.equipped?.passive === "shield")); this.hud.setShoesOwned(Boolean(this.equipped?.shoes || this.equipped?.passive === "shoes"));
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
