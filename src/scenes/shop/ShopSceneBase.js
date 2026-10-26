import { saveProgress } from "../../saveManager.js";
import { playMusic } from "../../soundManager.js";
import InventoryOverlay from "../../ui/InventoryOverlay.js";
import DialogManager from "../../dialogManager.js";
import TopHud from "../../ui/topHud.js";
import CoordinateDebugger from "../../utils/coordinateDebugger.js";
import { applyInventoryToSave, normalizeInventory } from "../../utils/inventory.js";
import { applyItemModeSupport, GAME_MODES } from "../../utils/itemRegistry.js";
import { offerHammerTraining } from "../../utils/hammerTraining.js";
import { recordDiscoveries } from '../../utils/expertDiscovery.js';

export default class ShopSceneBase extends Phaser.Scene {
  constructor(sceneKey) {
    super({ key: sceneKey });
    this.shopConfig = null;
  }

  create() {
    this.gameMode = GAME_MODES.ISOMETRIC;
    this.isLoading = true;
    this.shopConfig = this.getShopConfig();
    this.addBackground();
    this.addUI();
    this.dialog = new DialogManager(this);
    this.inventoryOpen = false;
    this.inventoryOverlay = new InventoryOverlay(this, {
      onEquip: (slot, id) => { this.equipped[slot] = id; this.updateHudAfterPurchase(); this.saveInventory(); },
      onClose: () => { this.inventoryOpen = false; },
    });
    this.events.once("shutdown", () => this.inventoryOverlay.destroy());
    this.showLoadingScreen();
    playMusic(this, "music-tavern");

    this.input.keyboard.on("keydown-ESC", () => {
      if (this.inventoryOpen) { this.toggleInventory(); return; }
      if (this.dialog.container?.visible) { this.dialog.hide(); return; }
      if (this.closeKnowledgeTip?.()) return;
      this.scene.start(this.shopConfig.returnSceneKey);
    });
    this.coordDebugger = new CoordinateDebugger(this);
    this.input.keyboard.on("keydown-F", () => this.toggleFullscreen());
  }

  getShopConfig() {
    throw new Error("ShopSceneBase.getShopConfig() must be implemented by subclasses.");
  }

  addBackground() {
    const bg = this.add.image(480, 300, this.shopConfig.backgroundKey);
    const scale = Math.max(960 / bg.width, 600 / bg.height);
    bg.setScale(scale);
  }

  addUI() {
    const saveData = this.getSaveData();
    const normalized = normalizeInventory(saveData);
    this.inventory = normalized.inventory;
    this.equipped = normalized.equipped;
    const normalizedSave = applyInventoryToSave(saveData, this.inventory, this.equipped);
    this.registry.set("saveData", normalizedSave);
    this.coins = normalizedSave.coins ?? 0;
    this.honeyCount = this.inventory.consumables?.honey ?? 0;
    this.hasShield = Boolean(this.inventory.passives?.shield);
    this.hasShoes = Boolean(this.inventory.passives?.shoes);
    this.health = normalizedSave.health ?? 5;
    this.maxHealth = 5;

    this.hud = new TopHud(this, {
      coins: this.coins,
      health: this.health,
      maxHealth: this.maxHealth,
      consumables: { honey: this.honeyCount },
      passiveOwned: Boolean(this.equipped?.shield || this.equipped?.passive === "shield"),
      passiveShoes: Boolean(this.equipped?.shoes || this.equipped?.passive === "shoes"),
      activeEquipped: this.equipped.weapon,
      passiveEquipped: this.equipped.passive,
      consumableEquipped: this.equipped.consumable === "honey",
      activeDisabled: true,
      showCompanion: true,
      companionHealth: 1,
      companionRespawnRatio: 0,
    });
    this.hud.setActiveEquipped(this.equipped.weapon);
    this.hud.setPassiveEquipped(this.equipped.passive);
    this.hud.setConsumableEquipped(this.equipped?.consumable === "honey");
    applyItemModeSupport(this.hud, this.equipped, this.gameMode);

    this.mapReturnHint = this.add
      .text(14, 585, "{back} · Zurück zur Karte", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0, 1);

    this.add
      .text(945, 585, this.shopConfig.locationText, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(1, 1)
      .setStroke("#3b2a17", 2);
  }

  shutdown() {
    const saveData = this.registry.get("saveData");
    const nextSave = {
      ...saveData,
      currentLevel: this.shopConfig.levelId,
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);
  }

  showLoadingScreen() {
    this.loadingScreen = this.add.image(480, 300, this.shopConfig.loadingKey).setDepth(25);
    const scale = Math.min(960 / this.loadingScreen.width, 600 / this.loadingScreen.height);
    this.loadingScreen.setScale(scale);
    const barWidth = 360;
    const barHeight = 16;
    this.loadingBarBg = this.add
      .rectangle(480, 552, barWidth, barHeight, 0x1e150c, 0.6)
      .setDepth(26);
    this.loadingBarFill = this.add
      .rectangle(480 - barWidth / 2, 552, 2, barHeight - 4, 0xf7edd6, 0.9)
      .setOrigin(0, 0.5)
      .setDepth(27);

    this.tweens.add({
      targets: this.loadingBarFill,
      displayWidth: barWidth - 4,
      duration: 2500,
      onComplete: () => this.hideLoadingScreen(),
    });
  }

  hideLoadingScreen() {
    if (this.loadingScreen) this.loadingScreen.destroy();
    if (this.loadingBarBg) this.loadingBarBg.destroy();
    if (this.loadingBarFill) this.loadingBarFill.destroy();
    this.isLoading = false;
    this.createShelf();
    this.showGreetingDialog();
  }

  showGreetingDialog() {
    this.dialog.show(this.buildDialog(this.shopConfig.greetingText || "Da bist du ja wieder!"), "bottom", {
      portraitKey: "tavern-barkeeper",
      portraitZoom: 1.3,
    });
  }

  buildDialog(firstText) {
    return [{ text: firstText }, { text: "Tippe auf einen Gegenstand, um ihn zu kaufen.\nDeine Ausrüstung findest du im Inventar · {inventory}." }];
  }

  toggleInventory() {
    if (this.isLoading || this.dialog?.container?.visible) return;
    this.inventoryOpen = !this.inventoryOpen;
    if (this.inventoryOpen) this.inventoryOverlay.open(this.inventory, this.equipped);
    else this.inventoryOverlay.close();
  }

  createShelf() {
    recordDiscoveries(this, this.shopConfig.items.map(item => item.id));
    this.selectedIndex = 0; this.buyButtons = [];
    this.add.text(662, 108, this.shopConfig.locationText.toUpperCase(), {
      fontFamily: "Georgia, serif", fontSize: "29px", color: "#fff0bb", stroke: "#183b2b", strokeThickness: 5,
    }).setOrigin(.5);
    const count = this.shopConfig.items.length, spacing = count > 3 ? 86 : 104;
    this.shopConfig.items.forEach((item, index) => {
      const y = 186 + index * spacing, group = this.add.container(0, 0);
      const card = this.add.rectangle(672, y, 446, spacing - 10, 0x243d2e, .96).setStrokeStyle(2, 0xc4aa70);
      const icons = { honey: "item-honey", bow: "item-bow", shield: "item-shield", jungleShield: "item-jungle-shield", shoes: "item-winged-shoes", powerHammer: "item-power-hammer" };
      const icon = this.add.image(495, y, item.icon || icons[item.id]).setDisplaySize(58, 58);
      const label = this.add.text(540, y - 25, item.label, { fontFamily: "Georgia, serif", fontSize: "22px", color: "#fff0c2" });
      const price = this.add.text(540, y + 9, "", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "16px", color: "#e1d9ae" });
      const target = this.add.zone(672, y, 446, spacing - 10).setInteractive({ useHandCursor: true });
      target.on("pointerdown", () => {
        if (this.inventoryOpen || this.dialog?.container?.visible) return;
        this.selectedIndex = index; this.buyItem(item); this.refreshShelf();
      });
      group.add([card, icon, label, price, target]);
      this.buyButtons.push({ card, icon, label, price, target, group, item });
    });
    this.statusText = this.add.text(665, count > 3 ? 510 : 495, "↑/↓: auswählen · {confirm}: kaufen", {
      fontFamily: "Trebuchet MS, sans-serif", fontSize: "16px", color: "#fff0c2", align: "center", wordWrap: { width: 465 }, stroke: "#193428", strokeThickness: 3,
    }).setOrigin(.5);
    const move = step => {
      if (this.inventoryOpen || this.dialog?.container?.visible) return;
      this.selectedIndex = (this.selectedIndex + step + count) % count; this.refreshShelf();
    };
    this.input.keyboard.on("keydown-UP", () => move(-1));
    this.input.keyboard.on("keydown-DOWN", () => move(1));
    this.input.keyboard.on("keydown-ENTER", () => {
      if (!this.inventoryOpen && !this.dialog?.container?.visible) this.buyItem(this.shopConfig.items[this.selectedIndex]);
    });
    this.add.text(170, 537, "← Zur Weltkarte", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "20px", color: "#fff0c2", backgroundColor: "#34543e", padding: { x: 16, y: 12 } })
      .setOrigin(.5).setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        if (!this.inventoryOpen && !this.dialog?.container?.visible) this.scene.start(this.shopConfig.returnSceneKey);
      });
    if (this.inventory.weapons?.powerHammer && this.shopConfig.items.some(item => item.id === 'powerHammer')) {
      this.add.text(170, 483, 'Hammer üben', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '18px',
        color: '#fff0c2', backgroundColor: '#644c32', padding: { x: 16, y: 9 } }).setOrigin(.5)
        .setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (!this.inventoryOpen && !this.dialog?.container?.visible) offerHammerTraining(this, { force: true });
        });
    }
    this.refreshShelf();
  }

  refreshShelf() {
    this.buyButtons?.forEach(({ card, icon, label, price, target, group, item }, index) => {
      const available = this.canShowItem(item), affordable = this.coins >= item.price;
      price.setText(available ? item.price + " Gold · Kaufen" : "✓ Gekauft · im Inventar");
      price.setColor(available ? affordable ? "#e8ddb4" : "#ffb5a1" : "#a8b4a1");
      group.setAlpha(available ? 1 : .58); icon.setTint(available ? 0xffffff : 0x777777); label.setColor(available ? "#fff0c2" : "#acb2a8");
      card.setStrokeStyle(available && index === this.selectedIndex ? 3 : 1, available && index === this.selectedIndex ? 0xffd77c : 0x7d8a70);
      if (available) target.setInteractive({ useHandCursor: true }); else target.disableInteractive();
    });
  }

  getPurchaseOptions() {
    const items = Array.isArray(this.shopConfig.items) ? this.shopConfig.items : [];
    return items
      .filter((item) => this.canShowItem(item))
      .map((item) => ({
        label: `${item.label} (${item.price})`,
        action: () => this.buyItem(item),
        keepOpen: true,
      }));
  }

  canShowItem(item) {
    if (item.id === "bow") return !this.inventory.passives?.bow;
    if (item.id === "powerHammer") return !this.inventory.weapons?.powerHammer;
    if (item.id === "jungleShield") return !this.inventory.passives?.jungleShield;
    if (item.id === "shield") return !this.hasShield;
    if (item.id === "shoes") return !this.hasShoes;
    return true;
  }

  buyItem(item) {
    if (this.isLoading) return;
    if (!this.canShowItem(item)) return;
    if (this.coins < item.price) {
      this.showNotEnoughCoinsDialog();
      return;
    }
    this.coins -= item.price;
    if (item.id === "bow") {
      this.inventory.passives.bow = true;
      this.equipped.secondary = "bow";
      if (!this.equipped.passive) this.equipped.passive = "bow";
    } else if (item.id === "powerHammer") {
      this.inventory.weapons.powerHammer = true;
    } else if (item.id === "honey") {
      this.honeyCount += 1;
      this.inventory.consumables.honey = this.honeyCount;
      if (!this.equipped.consumable) {
        this.equipped.consumable = "honey";
      }
    } else if (item.id === "jungleShield") {
      this.inventory.passives.jungleShield = true;
      this.equipped.shield = "jungleShield";
    } else if (item.id === "shield") {
      this.hasShield = true;
      this.inventory.passives.shield = true;
      if (!this.equipped.shield) this.equipped.shield = "shield";
      if (!this.equipped.passive) {
        this.equipped.passive = "shield";
      }
    } else if (item.id === "shoes") {
      this.hasShoes = true;
      this.inventory.passives.shoes = true;
      this.equipped.shoes = "shoes";
      if (!this.equipped.passive) {
        this.equipped.passive = "shoes";
      }
    }
    this.updateHudAfterPurchase();
    this.saveInventory();
    this.showPurchaseMessage(item.successText);
    this.refreshShelf();
    if (item.id === 'powerHammer' && this.scene?.start) offerHammerTraining(this);
  }

  showPurchaseMessage(text) {
    if (this.statusText) this.statusText.setText(text);
    else this.dialog.show([{ text }], "bottom", { portraitKey: "tavern-barkeeper", portraitZoom: 1.3 });
  }

  showNotEnoughCoinsDialog() {
    this.showPurchaseMessage("Du hast leider nicht genügend Münzen.");
  }

  updateHudAfterPurchase() {
    if (!this.hud) return;
    this.hud.setCoins(this.coins);
    this.hud.setConsumableCount(this.honeyCount);
    this.hud.setConsumableEquipped(this.equipped.consumable === "honey");
    this.hud.setPassiveOwned(Boolean(this.equipped?.shield || this.equipped?.passive === "shield"));
    this.hud.setShoesOwned(Boolean(this.equipped?.shoes || this.equipped?.passive === "shoes"));
    this.hud.setPassiveEquipped(this.equipped.passive);
    applyItemModeSupport(this.hud, this.equipped, this.gameMode);
  }

  getSaveData() {
    return this.registry.get("saveData") || {};
  }

  saveInventory() {
    const saveData = this.getSaveData();
    this.inventory.consumables.honey = this.honeyCount;
    const nextSave = applyInventoryToSave(
      {
        ...saveData,
        coins: this.coins,
        health: this.health,
      },
      this.inventory,
      this.equipped
    );
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
