import { saveProgress } from "../../saveManager.js";
import { playMusic } from "../../soundManager.js";
import DialogManager from "../../dialogManager.js";
import TopHud from "../../ui/topHud.js";
import CoordinateDebugger from "../../utils/coordinateDebugger.js";

export default class TavernScene extends Phaser.Scene {
  constructor() {
    super({ key: "TavernScene" });
  }

  init(data) {
    this.fromUnderground = data?.from === "underground";
  }

  create() {
    this.isLoading = true;
    const saveData = this.getSaveData();
    this.isUnderground = this.fromUnderground || saveData.currentLevel === "UnderShop";
    this.addBackground();
    this.addUI();
    this.dialog = new DialogManager(this);
    this.showLoadingScreen();
    playMusic(this, "music-tavern");

    this.input.keyboard.on("keydown-ESC", () =>
      this.scene.start(this.isUnderground ? "UndergroundMapScene" : "DessertMapScene")
    );
    this.coordDebugger = new CoordinateDebugger(this);
    this.input.keyboard.on("keydown-F", () => this.toggleFullscreen());
  }

  addBackground() {
    const textureKey = this.isUnderground ? "underground-shop" : "tavern-bg";
    const bg = this.add.image(480, 300, textureKey);
    const scale = Math.max(960 / bg.width, 600 / bg.height);
    bg.setScale(scale);
  }

  addUI() {
    this.coins = this.getSaveData().coins ?? 0;
    this.honeyCount = this.getSaveData().consumables?.honey ?? 0;
    this.health = this.getSaveData().health ?? 5;
    this.maxHealth = 5;
    
    this.hud = new TopHud(this, {
      coins: this.coins,
      health: this.health,
      maxHealth: this.maxHealth,
      consumables: { honey: this.honeyCount },
      activeDisabled: true,
      showCompanion: true,
      companionHealth: 1,
      companionRespawnRatio: 0,
    });

    const hintText = this.isUnderground
      ? "Esc = Zurück zur Unterwelt"
      : "Esc = Zurück zur Karte";
    this.add
      .text(40, 590, hintText, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0, 1);

    const locationText = this.isUnderground ? "Unterwelt-Shop" : "Taverne";
    this.add
      .text(950, 590, locationText, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(1, 1)
      .setStroke("#3b2a17", 2);
  }

  shutdown() {
    const saveData = this.registry.get("saveData");
    const nextLevel = this.isUnderground ? "UnderShop" : "Taverne";
    const nextSave = {
      ...saveData,
      currentLevel: nextLevel,
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);
  }

  showLoadingScreen() {
    const loadingKey = this.isUnderground ? "underground-shop-loading" : "tavern-loading";
    this.loadingScreen = this.add.image(480, 300, loadingKey).setDepth(25);
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

  buyHoney() {
    if (this.isLoading) return;
    const price = 10;
    if (this.coins < price) {
      this.showNotEnoughCoinsDialog();
      return;
    }
    this.coins -= price;
    this.honeyCount += 1;
    if (this.hud) {
      this.hud.setCoins(this.coins);
      this.hud.setConsumableCount(this.honeyCount);
    }
    this.saveInventory();
    this.showPurchaseDialog();
  }

  showGreetingDialog() {
    this.dialog.show(this.buildShopDialog(), "bottom", { portraitKey: "tavern-barkeeper" });
  }

  buildShopDialog() {
    return [
      { text: "Willkommen in meiner Taverne, Sir Ritter!" },
      {
        text: "Willst du Honigsaft kaufen? \nEr heilt dich und deinen Begleiter um ein Herz!",
        options: [{ key: "K", label: "[K] kaufen", onSelect: () => this.buyHoney(), keepOpen: true }],
      },
    ];
  }

  showPurchaseDialog() {
    this.dialog.show(
      [
        { text: "Hier ist der Honigsaft, darf es noch etwas sein?" },
        {
          text: "Willst du heilenden Honigsaft kaufen?",
          options: [{ key: "K", label: "[K] kaufen", onSelect: () => this.buyHoney(), keepOpen: true }],
        },
      ],
      "bottom",
      { portraitKey: "tavern-barkeeper" }
    );
  }

  showNotEnoughCoinsDialog() {
    this.dialog.show(
      [
        { text: "Du hast leider nicht genügend Münzen." },
        {
          text: "Willst du heilenden Honigsaft kaufen?",
          options: [{ key: "K", label: "[K] kaufen", onSelect: () => this.buyHoney(), keepOpen: true }],
        },
      ],
      "bottom",
      { portraitKey: "tavern-barkeeper" }
    );
  }

  getSaveData() {
    return this.registry.get("saveData") || {};
  }

  saveInventory() {
    const saveData = this.getSaveData();
    const nextSave = {
      ...saveData,
      coins: this.coins,
      health: this.health,
      consumables: {
        ...saveData.consumables,
        honey: this.honeyCount,
      },
    };
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
