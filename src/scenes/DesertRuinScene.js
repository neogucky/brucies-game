import { saveProgress } from "../saveManager.js";
import { playMusic } from "../soundManager.js";

export default class DesertRuinScene extends Phaser.Scene {
  constructor() {
    super({ key: "DesertRuinScene" });
    this.isGameOver = false;
    this.isPaused = false;
    this.isComplete = false;
    this.ruinRepaired = false;
    this.canPromptRuin = true;
    this.maxHealth = 5;
    this.health = this.maxHealth;
    this.coinsCollected = 0;
    this.ruinCost = 100;
    this.coinsPerChest = 10;
    this.helperRange = 150;
    this.helperSpeed = 230;
    this.helperLag = 0.08;
    this.helperFollowDistance = 18;
    this.helperHideDuration = 10000;
    this.helperAttackCooldown = 1000;
    this.helperApproachDuration = 100;
    this.helperReturnDuration = 100;
    this.monsterAttackCooldown = 500;
    this.helperRetreatDistance = 40;
    this.helperHitChance = 0.75;
    this.monsterHitChance = 0.5;
    this.monsterScale = 0.7;
    this.monsterEmergingScale = 0.4;
    this.companionDetectedDuration = 1000;
    this.companionDetectedDelay = 200;
    this.attackCooldown = 350;
    this.lastAttackAt = 0;
    this.swordSwingId = 0;
    this.skipShutdownSave = false;
  }

  create() {
    this.resetState();
    this.addBackground();
    this.createPlayer();
    this.createRuin();
    this.createUI();
    this.createBushes();
    this.createChests();
    this.createMonsters();
    this.spawnMonster();
    this.createSword();
    this.createRespawnTimers();
    this.createAudio();
    playMusic(this, "music-desert");
    this.showStartScreen();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D");
    this.input.keyboard.on("keydown-SPACE", () => this.swingSword());
    this.input.keyboard.on("keydown-T", () => this.useConsumable());
    this.input.keyboard.on("keydown-ESC", () => this.openExitPrompt());
    this.events.once("shutdown", () => {
      if (!this.skipShutdownSave) {
        this.saveInventory();
      }
    });
  }

  addBackground() {
    const bg = this.add.image(480, 300, "desert-bg");
    const scale = Math.max(960 / bg.width, 600 / bg.height);
    bg.setScale(scale);
  }

  createPlayer() {
    this.player = this.add.image(480, 360, "knight-standing").setOrigin(0.5);
    this.player.setScale(0.5);
    this.player.setDepth(5);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(this.player.width * 0.24, this.player.height * 0.7, true);
    this.player.body.setOffset(
      (this.player.width - this.player.body.width) * 0.5,
      (this.player.height - this.player.body.height) * 0.6
    );
    this.player.setData("standingTexture", "knight-standing");
    this.player.setData("hitTexture", "knight-hitting");

    const startOffsetX = 36;
    const startOffsetY = -22;
    this.companion = this.add
      .image(480 + startOffsetX, 360 + startOffsetY, "companion-running")
      .setOrigin(0.5);
    this.companion.setScale(0.545);
    this.companion.setDepth(5);
    this.physics.add.existing(this.companion);
    this.companion.body.setCircle(12);
    this.companion.body.setCollideWorldBounds(true);
    this.companion.setData("state", "follow");
    this.companion.setData("target", null);
    this.companion.setData("offset", { x: startOffsetX, y: startOffsetY });
    this.companion.setData("nextHitAt", 0);
    this.companion.setData("retreatUntil", 0);
    this.companion.setData("baseColor", 0xffffff);
    this.companion.setData("animState", "running");
    this.companion.setData("detectedUntil", 0);
    this.facing = new Phaser.Math.Vector2(1, 0);
  }

  resetState() {
    this.isGameOver = false;
    this.isPaused = false;
    this.isComplete = false;
    this.ruinRepaired = false;
    this.canPromptRuin = true;
    const saveData = this.registry.get("saveData") || {};
    this.health = saveData.health ?? this.maxHealth;
    this.coinsCollected = saveData.coins ?? 0;
    this.consumables = {
      honey: saveData.consumables?.honey ?? 0,
    };
    this.levelCompleted = (saveData.completedLevels || []).includes("Wuestenruine");
    this.lastAttackAt = 0;
    this.swordDidHit = false;
    this.swordSwingId = 0;
    this.companionHealth = 1;
    this.companionRespawnAt = 0;

    if (this.monsterSpawnEvent) {
      this.monsterSpawnEvent.remove(false);
    }
    if (this.chestSpawnEvent) {
      this.chestSpawnEvent.remove(false);
    }
    if (this.fruitSpawnEvent) {
      this.fruitSpawnEvent.remove(false);
    }
    if (this.companionAttackTween) {
      this.companionAttackTween.stop();
    }
    if (this.monsters && this.monsters.children) {
      this.monsters.clear(true, true);
    }
    if (this.chests && this.chests.children) {
      this.chests.clear(true, true);
    }
    if (this.fruits && this.fruits.children) {
      this.fruits.clear(true, true);
    }
    if (this.stopAllSounds) {
      this.stopAllSounds(true);
    }
  }

  createBushes() {
    const bushes = [
      { x: 180, y: 360, hasFruit: true },
      { x: 260, y: 220, hasFruit: false },
      { x: 740, y: 300, hasFruit: true },
      { x: 620, y: 200, hasFruit: false },
      { x: 420, y: 280, hasFruit: true },
      { x: 540, y: 360, hasFruit: false },
    ];

    this.fruits = this.physics.add.staticGroup();
    this.fruitSpots = [];
    this.fruitSlots = [];

    bushes.forEach((bush) => {
      this.add.circle(bush.x, bush.y + 4, 18, 0x3d4f26).setAlpha(0.9);
      this.add.circle(bush.x, bush.y - 6, 16, 0x4f6a2f).setAlpha(0.95);
      if (bush.hasFruit) {
        this.fruitSpots.push({ x: bush.x + 10, y: bush.y - 12 });
      }
    });

    this.physics.add.overlap(this.player, this.fruits, (_, fruit) => {
      if (this.health >= this.maxHealth) return;
      const slot = fruit.getData("slot");
      if (slot !== undefined) {
        this.fruitSlots[slot] = false;
      }
      fruit.destroy();
      if (this.health < this.maxHealth) {
        this.health = Math.min(this.maxHealth, this.health + 1);
        this.updateHearts();
        this.saveInventory();
      }
    });

    this.fruitSlots = this.fruitSpots.map(() => false);
    for (let i = 0; i < Math.min(3, this.fruitSpots.length); i += 1) {
      this.spawnFruit();
    }
  }

  createChests() {
    this.chests = this.physics.add.staticGroup();
    this.chestSpots = [
      { x: 160, y: 280 },
      { x: 300, y: 420 },
      { x: 430, y: 210 },
      { x: 560, y: 320 },
      { x: 700, y: 420 },
      { x: 800, y: 260 },
    ];
    this.chestSlots = this.chestSpots.map(() => false);

    for (let i = 0; i < Math.min(4, this.chestSpots.length); i += 1) {
      this.spawnChest();
    }
  }

  createMonsters() {
    this.monsters = this.physics.add.group();
    this.monsterSpawnEvent = this.time.addEvent({
      delay: 8000,
      loop: true,
      callback: () => this.spawnMonster(),
    });

    this.physics.add.overlap(this.player, this.monsters, (player, monster) => {
      this.handlePlayerHit(player, monster);
    });

    this.physics.add.overlap(this.companion, this.monsters, (companion, monster) => {
      this.handleCompanionInteraction(companion, monster);
    });
  }

  createUI() {
    this.coinIcon = this.add.image(28, 30, "ui-coin").setOrigin(0.5);
    this.coinIcon.setScale(0.7);
    this.coinText = this.add
      .text(50, 30, `Münzen: ${this.coinsCollected}`, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "18px",
        color: "#FFFFFF",
      })
      .setOrigin(0, 0.5)
      .setStroke("#433320", 3);

    this.createItemUI();
    this.createHeartsUI();

    this.add
      .text(30, 560, "Pfeiltasten zum bewegen, Früchte heilen, Schlag Truhen für Münzen", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "14px",
        color: "#FFFFFF",
      })
      .setOrigin(0, 0.5)
      .setStroke("#433320", 2);

    this.add
      .text(950, 590, "Wüstenruine", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#6c5134",
      })
      .setOrigin(1, 1)
      .setStroke("#f2e3c5", 2);

    this.statusText = this.add
      .text(480, 300, "", {
        fontFamily: "Georgia, serif",
        fontSize: "32px",
        color: "#5c4630",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.promptBox = this.add.container(0, 0).setDepth(20).setVisible(false);
    const promptShade = this.add.rectangle(480, 300, 960, 600, 0x2c2216, 0.65);
    const promptPanel = this.add.rectangle(480, 300, 520, 180, 0xe2c18b).setStrokeStyle(3, 0x8a6b44);
    this.promptText = this.add
      .text(480, 285, "", {
        fontFamily: "Georgia, serif",
        fontSize: "22px",
        color: "#3b2a17",
        align: "center",
      })
      .setOrigin(0.5);
    this.promptHint = this.add
      .text(480, 362, "", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "14px",
        color: "#4b3824",
        align: "center",
      })
      .setOrigin(0.5);
    this.promptBox.add([promptShade, promptPanel, this.promptText, this.promptHint]);
  }

  createAudio() {
    this.sfx = {
      chestHit: this.sound.add("sfx-chest-hit"),
      coin: this.sound.add("sfx-coin"),
      companionHit: this.sound.add("sfx-companion-hit"),
      monsterAttack: this.sound.add("sfx-monster-attack"),
      monsterDig: this.sound.add("sfx-monster-dig"),
      monsterInjured: this.sound.add("sfx-monster-injured"),
      monsterMiss: this.sound.add("sfx-monster-miss"),
      companionFear: this.sound.add("sfx-companion-fear"),
      gameOver: this.sound.add("sfx-gameover"),
      success: this.sound.add("sfx-success"),
      swordSlash: this.sound.add("sfx-sword-slash"),
    };
  }

  showStartScreen() {
    this.isPaused = true;
    this.canPromptRuin = false;
    this.physics.world.pause();
    this.startScreen = this.add.image(480, 300, "desert-start").setDepth(25);
    this.fitScreenImage(this.startScreen, 1);
    const barWidth = 360;
    const barHeight = 16;
    this.startBarBg = this.add
      .rectangle(480, 552, barWidth, barHeight, 0x1e150c, 0.6)
      .setDepth(999);
    this.startBarFill = this.add
      .rectangle(480 - barWidth / 2, 552, 2, barHeight - 4, 0xf7edd6, 0.9)
      .setOrigin(0, 0.5)
      .setDepth(1000);
    this.startBarLabel = this.add
      .text(480, 530, "Bereite die Wüste vor...", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "14px",
        color: "#f7edd6",
      })
      .setOrigin(0.5)
      .setDepth(1000);
    this.children.bringToTop(this.startBarBg);
    this.children.bringToTop(this.startBarFill);
    this.children.bringToTop(this.startBarLabel);

    const resume = () => {
      if (this.startScreen) {
        this.startScreen.destroy();
        this.startScreen = null;
      }
      if (this.startBarBg) {
        this.startBarBg.destroy();
        this.startBarBg = null;
      }
      if (this.startBarFill) {
        this.startBarFill.destroy();
        this.startBarFill = null;
      }
      if (this.startBarLabel) {
        this.startBarLabel.destroy();
        this.startBarLabel = null;
      }
      this.isPaused = false;
      this.canPromptRuin = true;
      this.physics.world.resume();
    };

    const duration = 2500;
    this.tweens.add({
      targets: this.startBarFill,
      displayWidth: barWidth - 4,
      duration,
      onComplete: () => resume(),
    });
  }

  createHeartsUI() {
    this.hearts = [];
    const spacing = 26;
    const startX = 930 - (this.maxHealth - 1) * spacing;

    for (let i = 0; i < this.maxHealth; i += 1) {
      const heart = this.createHeartIcon(startX + i * spacing, 30);
      this.hearts.push(heart);
    }

    this.updateHearts();
  }

  createItemUI() {
    const frameWidth = 52;
    const frameHeight = 52;
    const spacing = 80;
    const startX = 360;
    const y = 36;

    this.itemUI = {};
    const items = [
      { key: "active", label: "Schwert", hint: "Leertaste", icon: "item-sword" },
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

      this.itemUI[item.key] = { frame, label, hint, count, icon };
    });

    const companionX = startX + items.length * spacing;
    const companionFrame = this.add.rectangle(
      companionX,
      y,
      frameWidth,
      frameHeight,
      0xf2e3c5,
      0.8
    );
    companionFrame.setStrokeStyle(2, 0x8a6b44);
    const companionIcon = this.add
      .image(companionX, y, "item-companion")
      .setScale(0.26);
    const companionHeart = this.add
      .image(companionX, y + 40, "ui-heart")
      .setScale(0.6);
    const barWidth = 46;
    const barHeight = 6;
    const companionBarBg = this.add
      .rectangle(companionX, y + 40, barWidth, barHeight, 0x3a2a1a, 0.7)
      .setVisible(false);
    const companionBarFill = this.add
      .rectangle(companionX - barWidth / 2, y + 40, 2, barHeight - 2, 0xf2e3c5, 0.9)
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.itemUI.companion = {
      frame: companionFrame,
      icon: companionIcon,
      heart: companionHeart,
      barBg: companionBarBg,
      barFill: companionBarFill,
      barWidth,
    };

    this.updateItemUI();
  }

  updateItemUI() {
    if (!this.itemUI) return;
    const honeyCount = this.consumables?.honey ?? 0;
    const consumableLabel = honeyCount > 0 ? "Honigsaft" : "Leer";
    this.itemUI.consumable.label.setText(consumableLabel);
    this.itemUI.consumable.count.setText(honeyCount > 0 ? `x${honeyCount}` : "");
    this.itemUI.consumable.icon.setAlpha(honeyCount > 0 ? 1 : 0.25);

    if (this.itemUI.companion) {
      const hasHealth = this.companionHealth > 0;
      this.itemUI.companion.heart.setVisible(hasHealth);
      this.itemUI.companion.heart.setTexture(hasHealth ? "ui-heart" : "ui-heart-empty");
      this.itemUI.companion.barBg.setVisible(!hasHealth);
      this.itemUI.companion.barFill.setVisible(!hasHealth);
    }
  }

  createHeartIcon(x, y) {
    const heart = this.add.image(x, y, "ui-heart");
    heart.setScale(0.7);
    return heart;
  }

  updateHearts() {
    this.hearts.forEach((heart, index) => {
      const filled = index < this.health;
      heart.setTexture(filled ? "ui-heart" : "ui-heart-empty");
    });
  }

  createSword() {
    this.swordHitbox = this.add.rectangle(0, 0, 34, 18, 0xfff2d0, 0.2);
    this.physics.add.existing(this.swordHitbox);
    this.swordHitbox.body.setEnable(false);
    this.swordHitbox.setVisible(false);

    this.physics.add.overlap(this.swordHitbox, this.monsters, (_, monster) => {
      if (monster.getData("emerging")) return;
      if (this.swordHitTargets && this.swordHitTargets.has(monster)) return;
      if (this.swordHitTargets) {
        this.swordHitTargets.add(monster);
      }
      this.registerSwordHit();
      this.damageMonster(monster, 1);
      if (this.sfx) {
        this.sfx.monsterInjured.play();
      }
    });

    this.physics.add.overlap(this.swordHitbox, this.chests, (_, chest) => {
      this.registerSwordHit();
      this.openChest(chest);
    });
  }

  createRespawnTimers() {
    this.chestSpawnEvent = this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => this.spawnChest(),
    });
    this.fruitSpawnEvent = this.time.addEvent({
      delay: 20000,
      loop: true,
      callback: () => this.spawnFruit(),
    });
  }

  createRuin() {
    this.ruinSprite = this.add.image(480, 600, "desert-ruin").setOrigin(0.5, 1);
    const targetWidth = 600;
    const scale = (targetWidth / this.ruinSprite.width) * 0.5;
    this.ruinSprite.setScale(scale);
    if (this.levelCompleted) {
      this.ruinSprite.setTexture("desert-ruin-repaired");
    }

    const entranceWidth = this.ruinSprite.displayWidth * 0.36;
    const entranceHeight = this.ruinSprite.displayHeight * 0.72;
    this.ruinEntrance = this.add.rectangle(
      480,
      600 - entranceHeight / 2,
      entranceWidth,
      entranceHeight,
      0x000000,
      0
    );
    this.physics.add.existing(this.ruinEntrance, true);
  }

  spawnMonster() {
    if (this.isGameOver || this.isPaused) return;
    const margin = 60;
    const x = Phaser.Math.Between(margin, 960 - margin);
    const y = Phaser.Math.Between(120, 430);

    const monster = this.add.image(x, y, "desert-mole-digging").setOrigin(0.5);
    monster.setDepth(5);
    monster.setScale(this.monsterEmergingScale);
    this.physics.add.existing(monster);
    monster.body.setSize(monster.displayWidth * 0.5, monster.displayHeight * 0.5, true);
    monster.setData("maxHp", 3);
    monster.setData("hp", 3);
    monster.setData("speed", Phaser.Math.Between(60, 90));
    monster.setData("nextAttackAt", 0);
    monster.setData("nextHelperHitAt", 0);
    monster.setData("stunnedUntil", 0);
    monster.setData("emerging", true);
    monster.setAlpha(0.2);
    this.createMonsterBar(monster);
    if (this.sfx) {
      const digSound = this.sound.add("sfx-monster-dig", { loop: true, volume: 0.6 });
      digSound.play();
      monster.setData("digSound", digSound);
    }
    this.monsters.add(monster);

    this.tweens.add({
      targets: monster,
      alpha: 1,
      scale: this.monsterScale,
      duration: 2000,
      onComplete: () => {
        if (monster.active) {
          monster.setData("emerging", false);
          monster.setTexture("desert-mole-running");
          monster.setScale(this.monsterScale);
          monster.body.setSize(monster.displayWidth * 0.5, monster.displayHeight * 0.5, true);
          const digSound = monster.getData("digSound");
          if (digSound) {
            digSound.stop();
            digSound.destroy();
            monster.setData("digSound", null);
          }
        }
      },
    });
  }

  spawnChest() {
    if (this.isGameOver || this.isPaused) return;
    const maxChests = 4;
    if (this.chests.countActive(true) >= maxChests) return;
    const available = this.chestSlots
      .map((slot, index) => (!slot ? index : null))
      .filter((slot) => slot !== null);
    if (available.length === 0) return;

    const spotIndex = Phaser.Math.RND.pick(available);
    const spot = this.chestSpots[spotIndex];
    const chest = this.add.image(spot.x, spot.y, "chest-closed");
    chest.setScale(0.56);
    chest.setData("slot", spotIndex);
    chest.setData("opened", false);
    this.physics.add.existing(chest, true);
    this.chests.add(chest);
    this.chestSlots[spotIndex] = true;
  }

  spawnFruit() {
    if (this.isGameOver || this.isPaused) return;
    const maxFruits = 3;
    if (this.fruits.countActive(true) >= maxFruits) return;
    const available = this.fruitSlots
      .map((slot, index) => (!slot ? index : null))
      .filter((slot) => slot !== null);
    if (available.length === 0) return;

    const spotIndex = Phaser.Math.RND.pick(available);
    const spot = this.fruitSpots[spotIndex];
    const fruit = this.add.circle(spot.x, spot.y, 5, 0xc23a2c);
    fruit.setData("slot", spotIndex);
    this.physics.add.existing(fruit, true);
    this.fruits.add(fruit);
    this.fruitSlots[spotIndex] = true;
  }

  openChest(chest) {
    if (!chest.active || chest.getData("opened")) return;
    chest.setData("opened", true);
    if (this.sfx) {
      this.sfx.chestHit.play();
    }
    const slot = chest.getData("slot");
    if (slot !== undefined) {
      this.chestSlots[slot] = false;
    }

    this.addCoins(this.coinsPerChest);
    if (this.sfx) {
      this.sfx.coin.play();
    }

    chest.setTexture("chest-open");
    const coin = this.add.circle(chest.x, chest.y - 8, 6, 0xf5d37a);
    this.tweens.add({
      targets: coin,
      y: coin.y - 20,
      alpha: 0,
      duration: 450,
      onComplete: () => coin.destroy(),
    });

    this.time.delayedCall(1000, () => {
      if (chest.active) {
        chest.destroy();
      }
    });
  }

  addCoins(amount) {
    this.coinsCollected += amount;
    this.coinText.setText(`Münzen: ${this.coinsCollected}`);
    this.saveInventory();
  }

  spendCoins(amount) {
    if (this.coinsCollected < amount) return false;
    this.coinsCollected -= amount;
    this.coinText.setText(`Münzen: ${this.coinsCollected}`);
    this.saveInventory();
    return true;
  }

  saveInventory() {
    const saveData = this.registry.get("saveData") || {};
    const nextSave = {
      ...saveData,
      health: this.health,
      coins: this.coinsCollected,
      consumables: {
        ...saveData.consumables,
        ...this.consumables,
      },
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);
  }

  useConsumable() {
    if (!this.consumables || this.consumables.honey <= 0) return;
    if (this.health >= this.maxHealth) return;
    this.consumables.honey -= 1;
    this.health = Math.min(this.maxHealth, this.health + 1);
    this.updateHearts();
    this.updateItemUI();
    this.saveInventory();
  }

  registerSwordHit() {
    this.swordDidHit = true;
    if (this.swordSwingSoundEvent) {
      this.swordSwingSoundEvent.remove(false);
      this.swordSwingSoundEvent = null;
    }
  }

  handlePlayerHit(_, monster) {
    if (this.isGameOver || this.isPaused || monster.getData("emerging")) return;
    if (this.getMonsterTarget(monster) !== this.player) return;
    const now = this.time.now;
    if (monster.getData("nextAttackAt") > now) return;

    monster.setData("nextAttackAt", now + this.monsterAttackCooldown);
    if (Phaser.Math.FloatBetween(0, 1) <= this.monsterHitChance) {
      this.damagePlayer(1);
      this.flashEntity(this.player, 0xa33b2b);
      if (this.sfx) {
        this.sfx.monsterAttack.play();
      }
    } else if (this.sfx) {
      this.sfx.monsterMiss.play();
    }
  }

  handleCompanionInteraction(_, monster) {
    if (this.isGameOver || this.isPaused || this.isComplete) return;
    if (monster.getData("emerging")) return;

    const now = this.time.now;
    if (monster.getData("nextAttackAt") > now) return;
    if (this.getMonsterTarget(monster) !== this.companion) return;
    if (Phaser.Math.FloatBetween(0, 1) > this.monsterHitChance) {
      monster.setData("nextAttackAt", now + this.monsterAttackCooldown);
      if (this.sfx) {
        this.sfx.monsterMiss.play();
      }
      return;
    }
    monster.setData("nextAttackAt", now + this.monsterAttackCooldown);
    this.damageCompanion();
    if (this.sfx) {
      this.sfx.monsterAttack.play();
    }
  }

  damageMonster(monster, amount) {
    const currentHp = monster.getData("hp") ?? 0;
    const nextHp = Math.max(0, currentHp - amount);
    monster.setData("hp", nextHp);
    const now = this.time.now;
    const stunnedUntil = Math.max(monster.getData("stunnedUntil") || 0, now + 400);
    monster.setData("stunnedUntil", stunnedUntil);
    monster.body.setVelocity(0, 0);
    this.updateMonsterBar(monster);
    this.flashEntity(monster, 0xd06a5d);
    if (nextHp <= 0) {
      this.destroyMonster(monster);
      return false;
    }
    return true;
  }

  destroyMonster(monster) {
    const digSound = monster.getData("digSound");
    if (digSound) {
      digSound.stop();
      digSound.destroy();
    }
    this.destroyMonsterBar(monster);
    if (this.companion.getData("target") === monster) {
      this.companion.setData("target", null);
      this.companion.setData("state", "follow");
    }
    monster.destroy();
  }

  createMonsterBar(monster) {
    const barBg = this.add.rectangle(monster.x, monster.y - 22, 30, 6, 0x2f1e14);
    const barFill = this.add.rectangle(monster.x, monster.y - 22, 28, 4, 0xc23a2c);
    barBg.setOrigin(0.5);
    barFill.setOrigin(0.5);
    barBg.setDepth(5);
    barFill.setDepth(6);
    monster.setData("barBg", barBg);
    monster.setData("barFill", barFill);
    this.updateMonsterBar(monster);
  }

  updateMonsterBar(monster) {
    const barBg = monster.getData("barBg");
    const barFill = monster.getData("barFill");
    if (!barBg || !barFill) return;
    const maxHp = monster.getData("maxHp") || 3;
    const hp = monster.getData("hp") || 0;
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    barFill.setDisplaySize(28 * ratio, 4);
  }

  destroyMonsterBar(monster) {
    const barBg = monster.getData("barBg");
    const barFill = monster.getData("barFill");
    if (barBg) barBg.destroy();
    if (barFill) barFill.destroy();
  }

  bumpMonster(monster, source) {
    const now = this.time.now;
    monster.setData("stunnedUntil", now + 400);
    const direction = new Phaser.Math.Vector2(monster.x - source.x, monster.y - source.y)
      .normalize()
      .scale(180);
    monster.body.setVelocity(direction.x, direction.y);
  }

  triggerHelperHit() {
    if (this.companion.getData("state") === "hidden") return;
    this.companion.setData("state", "retreating");
    this.companion.setData("target", null);
  }

  damagePlayer(amount) {
    this.health = Math.max(0, this.health - amount);
    this.updateHearts();
    this.flashDamage();
    this.saveInventory();

    if (this.health <= 0) {
      this.gameOver();
    }
  }

  flashDamage() {
    const warning = this.add.rectangle(480, 300, 960, 600, 0xa33b2b).setAlpha(0.18);
    this.tweens.add({
      targets: warning,
      alpha: 0,
      duration: 240,
      onComplete: () => warning.destroy(),
    });
  }

  swingSword() {
    if (this.isGameOver || this.isPaused) return;
    const now = this.time.now;
    if (now - this.lastAttackAt < this.attackCooldown) return;
    this.lastAttackAt = now;
    this.swordSwingId += 1;
    this.swordHitTargets = new Set();
    this.swordDidHit = false;
    if (this.swordSwingSoundEvent) {
      this.swordSwingSoundEvent.remove(false);
    }
    this.swordSwingSoundEvent = this.time.delayedCall(90, () => {
      if (!this.swordDidHit && this.sfx) {
        this.sfx.swordSlash.play();
      }
    });

    this.isSwinging = true;
    if (this.player) {
      this.player.setTexture(this.player.getData("hitTexture") || "knight-hitting");
      this.player.setScale(0.5);
    }
    this.positionSword();
    this.swordHitbox.body.setEnable(true);
    this.swordHitbox.setVisible(true);

    this.time.delayedCall(140, () => {
      this.swordHitbox.body.setEnable(false);
      this.swordHitbox.setVisible(false);
      this.isSwinging = false;
      this.swordHitTargets = null;
      if (this.player) {
        this.player.setTexture(this.player.getData("standingTexture") || "knight-standing");
        this.player.setScale(0.5);
      }
    });
  }

  positionSword() {
    const offset = 26;
    this.swordHitbox.setPosition(
      this.player.x + this.facing.x * offset,
      this.player.y + this.facing.y * offset
    );
  }

  gameOver() {
    this.isGameOver = true;
    this.player.body.setVelocity(0, 0);
    this.lostScreen = this.add.image(480, 300, "desert-lost").setDepth(25);
    this.fitScreenImage(this.lostScreen, 1);
    this.gameOverHint = this.add
      .text(480, 540, "Enter für Neustart\nEsc für Weltkarte", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "18px",
        color: "#f7edd6",
      })
      .setOrigin(0.5)
      .setDepth(31)
      .setStroke("#3e6cc2", 3);
    this.physics.world.pause();
    if (this.monsterSpawnEvent) {
      this.monsterSpawnEvent.remove(false);
    }
    if (this.chestSpawnEvent) {
      this.chestSpawnEvent.remove(false);
    }
    if (this.fruitSpawnEvent) {
      this.fruitSpawnEvent.remove(false);
    }
    this.stopAllSounds();
    if (this.sfx) {
      this.sfx.gameOver.play();
    }

    const saveData = this.registry.get("saveData");
    const nextSave = {
      ...saveData,
      currentLevel: "Wuestenruine",
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);

    this.input.keyboard.once("keydown-ENTER", () => {
      const saveData = this.registry.get("saveData");
      if (saveData) {
        const nextSave = {
          ...saveData,
          health: this.maxHealth,
        };
        this.registry.set("saveData", nextSave);
        saveProgress(nextSave);
      }
      this.skipShutdownSave = true;
      this.scene.restart();
    });
    this.input.keyboard.once("keydown-ESC", () => {
      this.scene.start("WorldMapScene");
    });
  }

  showEndScreen() {
    this.isComplete = true;
    this.player.body.setVelocity(0, 0);
    this.statusText.setText("Enter für die Weltkarte");
    this.endScreen = this.add.image(480, 300, "desert-end").setDepth(25);
    this.fitScreenImage(this.endScreen, 1);
    this.physics.world.pause();
    if (this.monsterSpawnEvent) {
      this.monsterSpawnEvent.remove(false);
    }
    if (this.chestSpawnEvent) {
      this.chestSpawnEvent.remove(false);
    }
    if (this.fruitSpawnEvent) {
      this.fruitSpawnEvent.remove(false);
    }
    this.stopAllSounds();
    if (this.sfx) {
      this.sfx.success.play();
    }

    const saveData = this.registry.get("saveData");
    const nextSave = {
      ...saveData,
      currentLevel: "Wuestenruine",
      unlockedLevels: Array.from(
        new Set([...saveData.unlockedLevels, "Wuestenruine", "Taverne"])
      ),
      completedLevels: Array.from(
        new Set([...(saveData.completedLevels || []), "Wuestenruine"])
      ),
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);

    this.winHint = this.add
      .text(480, 545, "Drücke Enter um zur Weltkarte zu kommen", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "18px",
        color: "#f7edd6",
      })
      .setOrigin(0.5)
      .setDepth(31)
      .setStroke("#3e6cc2", 3);

    this.input.keyboard.once("keydown-ENTER", () => {
      this.scene.start("WorldMapScene");
    });
  }

  fitScreenImage(image, marginScale) {
    const targetScale = Math.min(960 / image.width, 600 / image.height) * marginScale;
    image.setScale(targetScale);
  }

  openRuinPrompt() {
    if (this.isPromptActive) return;
    this.isPaused = true;
    this.player.body.setVelocity(0, 0);
    this.physics.world.pause();
    this.promptBox.setVisible(true);
    this.isPromptActive = true;

    let onYes = null;
    let onNo = null;
    const closePrompt = (resumeWorld) => {
      if (onYes) this.input.keyboard.off("keydown-J", onYes);
      if (onNo) this.input.keyboard.off("keydown-N", onNo);
      this.promptBox.setVisible(false);
      this.isPromptActive = false;
      if (resumeWorld) {
        this.physics.world.resume();
        this.isPaused = false;
      }
    };

    if (this.levelCompleted) {
      this.promptText.setText("Die Ruine wurde schon repariert!\nLevel verlassen?");
      this.promptHint.setText("[J]a oder [N]ein");
      const onNo = () => closePrompt(true);
      const onYes = () => {
        closePrompt(false);
        this.scene.start("WorldMapScene");
      };
      this.input.keyboard.once("keydown-J", onYes);
      this.input.keyboard.once("keydown-N", onNo);
      return;
    }

    if (this.coinsCollected < this.ruinCost) {
      this.promptText.setText(
        `Leider hast du nicht genug Münzen.\nSammel ${this.ruinCost} Stück, um die Ruine zu reparieren.`
      );
      this.promptHint.setText("Beliebige Taste zum Weiterspielen");
      this.input.keyboard.once("keydown", () => closePrompt(true));
      return;
    }

    this.promptText.setText(`Die Ruine reparieren für ${this.ruinCost} Münzen?`);
    this.promptHint.setText("[J]a oder [N]ein");

    onNo = () => closePrompt(true);
    onYes = () => {
      this.spendCoins(this.ruinCost);
      this.ruinRepaired = true;
      closePrompt(true);
      this.showEndScreen();
    };

    this.input.keyboard.once("keydown-J", onYes);
    this.input.keyboard.once("keydown-N", onNo);
  }

  openExitPrompt() {
    if (this.isPromptActive || this.isComplete || this.isGameOver) return;
    this.isPaused = true;
    this.player.body.setVelocity(0, 0);
    this.physics.world.pause();
    this.promptBox.setVisible(true);
    this.promptText.setText("Willst du das Level wirklich verlassen?");
    this.promptHint.setText("[J]a oder [N]ein");
    this.isPromptActive = true;

    const closePrompt = (resumeWorld) => {
      this.input.keyboard.off("keydown-J", onYes);
      this.input.keyboard.off("keydown-N", onNo);
      this.promptBox.setVisible(false);
      this.isPromptActive = false;
      if (resumeWorld) {
        this.physics.world.resume();
        this.isPaused = false;
      }
    };

    const onYes = () => {
      closePrompt(false);
      this.scene.start("WorldMapScene");
    };
    const onNo = () => closePrompt(true);

    this.input.keyboard.once("keydown-J", onYes);
    this.input.keyboard.once("keydown-N", onNo);
  }

  update() {
    if (this.isGameOver || this.isPaused || this.isComplete) {
      this.player.body.setVelocity(0, 0);
      return;
    }

    const speed = 200;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= speed;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += speed;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= speed;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += speed;

    this.player.body.setVelocity(vx, vy);
    if (vx > 0) {
      this.player.setFlipX(true);
    } else if (vx < 0) {
      this.player.setFlipX(false);
    }

    this.updateCompanion();
    this.updateCompanionUI();

    const movementLength = Math.hypot(vx, vy);
    if (movementLength > 0) {
      this.facing.set(vx / movementLength, vy / movementLength);
    }

    if (this.isSwinging) {
      this.positionSword();
    }

    const isOnRuin = Phaser.Geom.Intersects.RectangleToRectangle(
      this.player.getBounds(),
      this.ruinEntrance.getBounds()
    );
    if (!isOnRuin) {
      this.canPromptRuin = true;
    } else if (this.canPromptRuin && !this.ruinRepaired) {
      this.canPromptRuin = false;
      this.openRuinPrompt();
    }

    this.monsters.getChildren().forEach((monster) => {
      this.updateMonsterBarPosition(monster);
      if (monster.getData("emerging")) {
        monster.body.setVelocity(0, 0);
        return;
      }
      const stunnedUntil = monster.getData("stunnedUntil") || 0;
      if (this.time.now < stunnedUntil) {
        return;
      }
      const speedValue = monster.getData("speed") || 70;
      const target = this.getMonsterTarget(monster);
      const direction = new Phaser.Math.Vector2(
        target.x - monster.x,
        target.y - monster.y
      ).normalize();
      monster.body.setVelocity(direction.x * speedValue, direction.y * speedValue);
    });
  }

  getMonsterTarget(monster) {
    if (this.companion.visible && this.companion.body.enable) {
      const distHelper = Phaser.Math.Distance.Between(
        monster.x,
        monster.y,
        this.companion.x,
        this.companion.y
      );
      const distPlayer = Phaser.Math.Distance.Between(
        monster.x,
        monster.y,
        this.player.x,
        this.player.y
      );
      if (distHelper <= distPlayer) {
        return this.companion;
      }
    }
    return this.player;
  }

  updateMonsterBarPosition(monster) {
    const barBg = monster.getData("barBg");
    const barFill = monster.getData("barFill");
    if (!barBg || !barFill) return;
    const offsetY = monster.y - 22;
    barBg.setPosition(monster.x, offsetY);
    barFill.setPosition(monster.x, offsetY);
  }

  updateCompanion() {
    const state = this.companion.getData("state");
    if (state === "hidden") {
      return;
    }

    if (state === "retreating") {
      this.setCompanionVisual("running");
      const distance = Phaser.Math.Distance.Between(
        this.companion.x,
        this.companion.y,
        this.player.x,
        this.player.y
      );
      if (distance <= 14) {
        this.hideCompanion();
        return;
      }
      this.moveCompanionToward(this.player.x, this.player.y, this.helperSpeed);
      return;
    }

    if (state === "attack-approach" || state === "attack-return") {
      this.setCompanionVisual("attacking");
      return;
    }

    if (state === "cooldown") {
      const nextHitAt = this.companion.getData("nextHitAt") || 0;
      if (this.time.now >= nextHitAt) {
        this.companion.setData("state", "follow");
      }
    }

    let target = this.companion.getData("target");
    if (!target || !target.active) {
      target = this.findNearestMonster();
      this.companion.setData("target", target);
    }

    if (target) {
      const nextHitAt = this.companion.getData("nextHitAt") || 0;
      if (this.time.now >= nextHitAt && state !== "cooldown") {
        this.setCompanionDetected(target);
        if (this.canStartDetectedChase()) {
          this.startCompanionAttack(target);
        }
      } else {
        this.setCompanionDetected(target);
        this.followCompanion();
      }
    } else {
      this.companion.setData("state", "follow");
      this.followCompanion();
    }
  }

  startCompanionAttack(target) {
    this.companion.setData("state", "attack-approach");
    this.companion.setData("target", target);
    this.setCompanionVisual("attacking");
    if (target) {
      this.companion.setFlipX(target.x < this.companion.x);
    }
    if (this.companionAttackTween) {
      this.companionAttackTween.stop();
    }
    this.companionAttackTween = this.tweens.add({
      targets: this.companion,
      x: target.x,
      y: target.y,
      duration: this.helperApproachDuration,
      onComplete: () => {
        this.resolveCompanionHit(target);
        this.startCompanionReturn();
      },
    });
  }

  resolveCompanionHit(target) {
    if (!target || !target.active || target.getData("emerging")) {
      return;
    }
    if (Phaser.Math.FloatBetween(0, 1) <= this.helperHitChance) {
      this.damageMonster(target, 1);
      if (this.sfx) {
        this.sfx.companionHit.play();
      }
    } else if (this.sfx) {
      this.sfx.monsterMiss.play();
    }
    this.flashEntity(this.companion, 0xffb3a3);
  }

  startCompanionReturn() {
    const followPos = this.getCompanionFollowPosition();
    this.companion.setData("state", "attack-return");
    this.setCompanionVisual("running");
    if (this.companionAttackTween) {
      this.companionAttackTween.stop();
    }
    this.companionAttackTween = this.tweens.add({
      targets: this.companion,
      x: followPos.x,
      y: followPos.y,
      duration: this.helperReturnDuration,
      onComplete: () => {
        this.companion.setData("state", "cooldown");
        this.companion.setData("nextHitAt", this.time.now + this.helperAttackCooldown);
      },
    });
  }

  followCompanion() {
    const followPos = this.getCompanionFollowPosition();
    const distance = Phaser.Math.Distance.Between(
      this.companion.x,
      this.companion.y,
      followPos.x,
      followPos.y
    );
    if (distance > this.helperFollowDistance) {
      this.setCompanionVisual("running");
      this.moveCompanionToward(followPos.x, followPos.y, this.helperSpeed);
    } else {
      this.setCompanionVisual("searching");
      this.companion.body.setVelocity(0, 0);
    }
  }

  getCompanionFollowPosition() {
    const offset = this.companion.getData("offset") || { x: 12, y: -10 };
    return {
      x: this.player.x + offset.x,
      y: this.player.y + offset.y,
    };
  }

  moveCompanionToward(x, y, speed) {
    const direction = new Phaser.Math.Vector2(x - this.companion.x, y - this.companion.y);
    if (direction.lengthSq() < 1) {
      this.companion.body.setVelocity(0, 0);
      return;
    }
    direction.normalize();
    const desiredX = direction.x * speed;
    const desiredY = direction.y * speed;
    const current = this.companion.body.velocity;
    const nextX = Phaser.Math.Linear(current.x, desiredX, this.helperLag);
    const nextY = Phaser.Math.Linear(current.y, desiredY, this.helperLag);
    this.companion.body.setVelocity(nextX, nextY);
  }

  findNearestMonster() {
    let nearest = null;
    let nearestDistance = this.helperRange;
    this.monsters.getChildren().forEach((monster) => {
      if (!monster.active || monster.getData("emerging")) return;
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        monster.x,
        monster.y
      );
      if (distance <= nearestDistance) {
        nearest = monster;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  hideCompanion() {
    this.companion.setData("state", "hidden");
    this.companion.setVisible(false);
    this.companion.body.setEnable(false);
    this.companion.setPosition(this.player.x, this.player.y);
    this.companionRespawnAt = this.time.now + this.helperHideDuration;
    this.updateItemUI();
    this.time.delayedCall(this.helperHideDuration, () => {
      if (this.isGameOver || this.isComplete) return;
      const offset = this.companion.getData("offset") || { x: 12, y: -10 };
      this.companion.clearTint();
      this.companion.setVisible(true);
      this.companion.body.setEnable(true);
      this.companion.setPosition(this.player.x + offset.x, this.player.y + offset.y);
      this.companion.setData("state", "follow");
      this.setCompanionVisual("running");
      this.companionHealth = 1;
      this.companionRespawnAt = 0;
      this.updateItemUI();
    });
  }

  damageCompanion() {
    if (!this.companion.visible || !this.companion.body.enable) return;
    if (this.companionHealth <= 0) return;
    this.companionHealth = 0;
    this.flashEntity(this.companion, 0xff7a7a);
    if (this.sfx) {
      this.sfx.companionFear.play();
    }
    if (this.companionAttackTween) {
      this.companionAttackTween.stop();
    }
    this.companion.setData("state", "retreating");
    this.companion.setData("target", null);
    this.companion.setData("retreatUntil", 0);
  }

  updateCompanionUI() {
    if (!this.itemUI || !this.itemUI.companion) return;
    if (this.companionHealth > 0) return;
    if (!this.companionRespawnAt) return;
    const remaining = Math.max(0, this.companionRespawnAt - this.time.now);
    const ratio = 1 - Math.min(1, remaining / this.helperHideDuration);
    const width = (this.itemUI.companion.barWidth - 4) * ratio;
    this.itemUI.companion.barFill.displayWidth = Math.max(2, width);
  }

  setCompanionDetected(target) {
    if (!target) return;
    const now = this.time.now;
    const detectedUntil = this.companion.getData("detectedUntil") || 0;
    if (now > detectedUntil) {
      this.companion.setData(
        "detectedUntil",
        now + this.companionDetectedDuration + this.companionDetectedDelay
      );
      this.companion.setData("detectedStart", now);
      this.setCompanionVisual("detected");
    }
  }

  canStartDetectedChase() {
    const detectedStart = this.companion.getData("detectedStart") || 0;
    return this.time.now - detectedStart >= this.companionDetectedDelay;
  }

  setCompanionVisual(state) {
    const current = this.companion.getData("animState");
    if (current === state) return;
    this.companion.setData("animState", state);
    if (state === "running") {
      this.companion.setTexture("companion-running");
    } else if (state === "searching") {
      this.companion.setTexture("companion-searching");
    } else if (state === "detected") {
      this.companion.setTexture("companion-detected");
    } else if (state === "attacking") {
      this.companion.setTexture("companion-attacking");
    }
  }

  flashEntity(entity, color) {
    if (entity.setTintFill) {
      entity.setTintFill(color);
      this.time.delayedCall(120, () => {
        if (entity.active) {
          entity.clearTint();
        }
      });
      return;
    }
    const original = entity.getData("baseColor") ?? entity.fillColor;
    if (original === undefined) return;
    entity.setFillStyle(color);
    this.time.delayedCall(120, () => {
      if (entity.active) {
        entity.setFillStyle(original);
      }
    });
  }

  stopAllSounds(includeMusic = false) {
    if (!this.sfx) return;
    Object.values(this.sfx).forEach((sound) => {
      if (sound && sound.isPlaying) {
        sound.stop();
      }
    });
  }
}
