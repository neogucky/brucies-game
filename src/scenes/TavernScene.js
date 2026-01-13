import { saveProgress } from "../saveManager.js";
import { playMusic } from "../soundManager.js";
import DialogManager from "../dialogManager.js";

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
    
    this.createItemUI();
    this.createHeartsUI();

    this.coinIcon = this.add.image(28, 30, "ui-coin").setOrigin(0.5);
    this.coinIcon.setScale(0.7);
    this.coinText = this.add
      .text(50, 30, `Münzen: ${this.coins}`, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "18px",
        color: "#f7e3c0",
      })
      .setOrigin(0, 0.5)
      .setStroke("#3e6cc2", 3);

    this.shopText = this.add
      .text(480, 250, "Honigsaft (10 Münzen) - [K] kaufen", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "18px",
        color: "#dfc49a",
      })
      .setOrigin(0.5);

    this.honeyText = this.add
      .text(480, 290, `Honigsaft: x${this.honeyCount}`, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#dfc49a",
      })
      .setOrigin(0.5);

    this.messageText = this.add
      .text(480, 380, "", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#f1b983",
      })
      .setOrigin(0.5);

    this.add
      .text(40, 590, "Esc = Zurück zur Karte", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#c5b08e",
      })
      .setOrigin(0, 1);

    this.add
      .text(950, 590, "Taverne", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#c5b08e",
      })
      .setOrigin(1, 1)
      .setStroke("#3e6cc2", 2);
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
      this.messageText.setText("Nicht genug Münzen.");
      return;
    }
    this.coins -= price;
    this.honeyCount += 1;
    this.coinText.setText(`Münzen: ${this.coins}`);
    this.honeyText.setText(`Honigsaft: x${this.honeyCount}`);
    this.messageText.setText("Honigsaft gekauft!");
    this.saveInventory();
    this.updateItemUI();
    this.showPurchaseDialog();
  }

  showGreetingDialog() {
    this.dialog.show(this.buildShopDialog(), "bottom");
  }

  buildShopDialog() {
    return [
      { text: "Willkommen in meiner Taverne, Sir Ritter!" },
      {
        text: "Willst du heilenden Honigsaft kaufen?",
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
      "bottom"
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

  createItemUI() {
    const frameWidth = 52;
    const frameHeight = 52;
    const spacing = 80;
    const startX = 360;
    const y = 36;

    this.itemUI = {};
    const items = [
      { key: "active", label: "Schwert", hint: "Leertaste", disabled: true, icon: "item-sword" },
      { key: "passive", label: "Schild", hint: "Passiv", icon: "item-shield" },
      { key: "consumable", label: "Leer", hint: "T", icon: "item-honey" },
    ];

    items.forEach((item, index) => {
      const x = startX + index * spacing;
      const frame = this.add.rectangle(x, y, frameWidth, frameHeight, 0xf2e3c5, 0.8);
      frame.setStrokeStyle(2, 0x8a6b44);
      const label = this.add
        .text(x, y - 4, item.label, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "12px",
          color: "#4b3824",
        })
        .setOrigin(0.5);
      const icon = this.add.image(x, y, item.icon).setScale(0.26);
      let overlay = null;
      const hint = this.add
        .text(x, y + 36, item.hint, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "12px",
          color: "#4b3824",
        })
        .setOrigin(0.5);
      const count = this.add
        .text(x + 18, y - 18, "", {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "12px",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      if (item.disabled) {
        frame.setFillStyle(0xd1c2a3, 0.6);
        label.setColor("#8b8373");
        hint.setColor("#8b8373");
        overlay = this.add.rectangle(x, y, frameWidth, frameHeight, 0x6f6f6f, 0.6);
      }

      this.itemUI[item.key] = { frame, label, hint, count, icon, overlay };
    });

    this.updateItemUI();
  }

  updateItemUI() {
    if (!this.itemUI) return;
    const honeyCount = this.honeyCount ?? 0;
    const consumableLabel = honeyCount > 0 ? "Honigsaft" : "Leer";
    this.itemUI.consumable.label.setText(consumableLabel);
    this.itemUI.consumable.count.setText(honeyCount > 0 ? `x${honeyCount}` : "");
    this.itemUI.consumable.icon.setAlpha(honeyCount > 0 ? 1 : 0.25);
  }

  createHeartsUI() {
    this.hearts = [];
    const spacing = 26;
    const startX = 930 - (this.maxHealth - 1) * spacing;
    for (let i = 0; i < this.maxHealth; i += 1) {
      const heart = this.add.image(startX + i * spacing, 30, "ui-heart");
      heart.setScale(0.7);
      this.hearts.push(heart);
    }
    this.updateHearts();
  }

  updateHearts() {
    this.hearts.forEach((heart, index) => {
      const filled = index < this.health;
      heart.setTexture(filled ? "ui-heart" : "ui-heart-empty");
    });
  }
}
