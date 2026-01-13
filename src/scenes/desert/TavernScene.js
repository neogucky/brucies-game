import { saveProgress } from "../../saveManager.js";
import { playMusic } from "../../soundManager.js";
import DialogManager from "../../dialogManager.js";
import TopHud from "../../ui/topHud.js";

export default class TavernScene extends Phaser.Scene {
  constructor() {
    super({ key: "TavernScene" });
  }

  create() {
    this.isLoading = true;
    this.addBackground();
    this.addUI();
    this.dialog = new DialogManager(this);
    this.showLoadingScreen();
    playMusic(this, "music-tavern");

    this.input.keyboard.on("keydown-ESC", () => this.scene.start("WorldMapScene"));
  }

  addBackground() {
    const bg = this.add.image(480, 300, "tavern-bg");
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

    this.add
      .text(40, 590, "Esc = Zurück zur Karte", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0, 1);

    this.add
      .text(950, 590, "Taverne", {
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
      currentLevel: "Taverne",
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);
  }

  showLoadingScreen() {
    this.loadingScreen = this.add.image(480, 300, "tavern-loading").setDepth(25);
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
        text: "Willst du Honigsaft kaufen? Er heilt dich und deinen Begleiter um ein Herz!",
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

  
}
