import { saveProgress } from "../../saveManager.js";
import { playMusic } from "../../soundManager.js";
import DialogManager from "../../dialogManager.js";
import TopHud from "../../ui/topHud.js";
import CoordinateDebugger from "../../utils/coordinateDebugger.js";
import { applyInventoryToSave, normalizeInventory } from "../../utils/inventory.js";
import { applyItemModeSupport, GAME_MODES } from "../../utils/itemRegistry.js";

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
    this.showLoadingScreen();
    playMusic(this, "music-tavern");

    this.input.keyboard.on("keydown-ESC", () => this.scene.start(this.shopConfig.returnSceneKey));
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
      passiveOwned: this.equipped.passive === "shield",
      passiveShoes: this.equipped.passive === "shoes",
      activeEquipped: this.equipped.weapon === "sword",
      passiveEquipped: this.equipped.passive,
      consumableEquipped: this.equipped.consumable === "honey",
      activeDisabled: true,
      showCompanion: true,
      companionHealth: 1,
      companionRespawnRatio: 0,
    });
    this.hud.setActiveEquipped(this.equipped.weapon === "sword");
    this.hud.setPassiveEquipped(this.equipped.passive);
    this.hud.setConsumableEquipped(this.equipped?.consumable === "honey");
    applyItemModeSupport(this.hud, this.equipped, this.gameMode);

    this.add
      .text(14, 585, "Esc = Zurück zur Karte", {
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
    this.showGreetingDialog();
  }

  showGreetingDialog() {
    this.dialog.show(this.buildDialog(this.shopConfig.greetingText), "bottom", {
      portraitKey: "tavern-barkeeper",
      portraitZoom: 1.3,
    });
  }

  buildDialog(firstText) {
    return [
      { text: firstText },
      {
        text: this.shopConfig.promptText ?? "Was möchtest du kaufen?",
        options: this.getPurchaseOptions(),
      },
    ];
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
    if (item.id === "honey") {
      this.honeyCount += 1;
      this.inventory.consumables.honey = this.honeyCount;
      if (!this.equipped.consumable) {
        this.equipped.consumable = "honey";
      }
    } else if (item.id === "shield") {
      this.hasShield = true;
      this.inventory.passives.shield = true;
      if (!this.equipped.passive) {
        this.equipped.passive = "shield";
      }
    } else if (item.id === "shoes") {
      this.hasShoes = true;
      this.inventory.passives.shoes = true;
      if (!this.equipped.passive) {
        this.equipped.passive = "shoes";
      }
    }
    this.updateHudAfterPurchase();
    this.saveInventory();
    this.dialog.show(this.buildDialog(item.successText), "bottom", {
      portraitKey: "tavern-barkeeper",
      portraitZoom: 1.3,
    });
  }

  showNotEnoughCoinsDialog() {
    this.dialog.show(this.buildDialog("Du hast leider nicht genügend Münzen."), "bottom", {
      portraitKey: "tavern-barkeeper",
      portraitZoom: 1.3,
    });
  }

  updateHudAfterPurchase() {
    if (!this.hud) return;
    this.hud.setCoins(this.coins);
    this.hud.setConsumableCount(this.honeyCount);
    this.hud.setConsumableEquipped(this.equipped.consumable === "honey");
    this.hud.setPassiveOwned(this.equipped.passive === "shield");
    this.hud.setShoesOwned(this.equipped.passive === "shoes");
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
