import { saveProgress } from "../../saveManager.js";
import { playMusic, bumpMusicRate } from "../../soundManager.js";
import TopHud from "../../ui/topHud.js";
import MonsterSpawner from "./MonsterSpawner.js";

export default class DesertTunnelScene extends Phaser.Scene {
  constructor() {
    super({ key: "DesertTunnelScene" });
    this.isGameOver = false;
    this.isPaused = false;
    this.isComplete = false;
    this.maxHealth = 5;
    this.health = this.maxHealth;
    this.coinsCollected = 0;
    this.stonesCollected = 0;
    this.tunnelCost = 200;
    this.helperRange = 150;
    this.helperSpeed = 200;
    this.helperLag = 0.08;
    this.helperFollowDistance = 18;
    this.helperHideDuration = 10000;
    this.helperAttackCooldown = 1200;
    this.helperAttackRange = 30;
    this.helperFruitRange = 220;
    this.helperApproachDuration = 100;
    this.helperReturnDuration = 100;
    this.monsterAttackCooldown = 800;
    this.monsterAttackRange = 5;
    this.autoAimRangeX = 60;
    this.autoAimRangeY = 30;
    this.helperRetreatDistance = 40;
    this.helperHitChance = 1;
    this.monsterHitChance = 1;
    this.helperInvulnDuration = 1000;
    this.monsterScale = 0.7;
    this.monsterEmergingScale = 0.4;
    this.companionDetectedDuration = 1000;
    this.companionDetectedDelay = 200;
    this.attackCooldown = 350;
    this.lastAttackAt = 0;
    this.swordSwingId = 0;
    this.skipShutdownSave = false;
    this.bossSpawned = false;
    this.typeIntroducedCount = 0;
    this.redUnlocked = false;
    this.blueUnlocked = false;
    this.spawners = {};
  }

  create() {
    this.resetState();
    this.addBackground();
    this.createPlayer();
    this.createTunnel();
    this.createUI();
    this.createBushes();
    this.createStonePiles();
    this.createChests();
    this.createMonsters();
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
    this.input.keyboard.on("keydown-ONE", () => this.spawnBossNow());
    this.events.once("shutdown", () => {
      if (!this.skipShutdownSave) {
        this.saveInventory();
      }
      this.stopEndlessTimers();
      this.activeDigSounds?.forEach((digSound) => {
        digSound.stop();
        digSound.destroy();
      });
      this.activeDigSounds?.clear();
      this.sound.stopByKey?.("sfx-monster-dig");
    });
  }

  addBackground() {
    const bg = this.add.image(480, 300, "desert-bg");
    const scale = Math.max(960 / bg.width, 600 / bg.height);
    bg.setScale(scale);
  }

  createPlayer() {
    const saveData = this.registry.get("saveData") || {};
    const isFemale = saveData.playerGender === "female";
    const standingTexture = isFemale ? "knight-female-standing" : "knight-standing";
    const hittingTexture = isFemale ? "knight-female-hitting" : "knight-hitting";
    this.player = this.add.image(480, 360, standingTexture).setOrigin(0.5);
    this.player.setScale(0.5);
    this.player.setDepth(5);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(this.player.width * 0.24, this.player.height * 0.7, true);
    this.player.body.setOffset(
      (this.player.width - this.player.body.width) * 0.5,
      (this.player.height - this.player.body.height) * 0.6
    );
    this.player.setData("standingTexture", standingTexture);
    this.player.setData("hitTexture", hittingTexture);

    this.companion = this.add
      .image(480 + 24, 360 + 16, "companion-running")
      .setOrigin(0.5);
    this.companion.setScale(0.545);
    this.companion.setDepth(5);
    this.physics.add.existing(this.companion);
    this.companion.body.setCircle(12);
    this.companion.body.setCollideWorldBounds(true);
    this.companion.setData("state", "follow");
    this.companion.setData("target", null);
    this.companion.setData("nextHitAt", 0);
    this.companion.setData("retreatUntil", 0);
    this.companion.setData("invulnerableUntil", 0);
    this.companion.setData("fruitTarget", null);
    this.companion.setData("fetching", false);
    this.companion.setData("baseColor", 0xffffff);
    this.companion.setData("animState", "running");
    this.companion.setData("detectedUntil", 0);
    const followPos = this.getCompanionFollowPosition();
    this.companion.setPosition(followPos.x, followPos.y);
    this.companionFruit = this.add.circle(this.companion.x + 8, this.companion.y - 8, 4, 0xc23a2c);
    this.companionFruit.setDepth(6);
    this.companionFruit.setVisible(false);
    this.facing = new Phaser.Math.Vector2(1, 0);
  }

  resetState() {
    this.isGameOver = false;
    this.isPaused = false;
    this.isComplete = false;
    this.canPromptTunnel = true;
    const saveData = this.registry.get("saveData") || {};
    this.health = saveData.health ?? this.maxHealth;
    this.coinsCollected = saveData.coins ?? 0;
    this.autoAimEnabled = Boolean(saveData.settings?.autoAim);
    this.stonesCollected = 0;
    this.consumables = {
      honey: saveData.consumables?.honey ?? 0,
    };
    this.lastAttackAt = 0;
    this.swordDidHit = false;
    this.swordSwingId = 0;
    this.companionHealth = 1;
    this.companionRespawnAt = 0;
    this.bossSpawned = false;
    this.typeIntroducedCount = 0;
    this.redUnlocked = false;
    this.blueUnlocked = false;
    this.activeDigSounds = new Set();

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

  createUI() {
    this.hud = new TopHud(this, {
      coins: this.coinsCollected,
      health: this.health,
      maxHealth: this.maxHealth,
      consumables: this.consumables,
      activeDisabled: false,
      showCompanion: true,
      companionHealth: this.companionHealth,
      companionRespawnRatio: 0,
      showStones: true,
      stones: this.stonesCollected,
    });

    this.add
      .text(30, 560, "Pfeiltasten zum bewegen, Früchte heilen, Schwert = Sammeln", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5)
      .setStroke("#3b2a17", 2);

    this.add
      .text(950, 590, "Wüstentunnel", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(1, 1)
      .setStroke("#3b2a17", 2);

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
      eating: this.sound.add("sfx-eating"),
      charging: this.sound.add("sfx-charging"),
      powerAttack: this.sound.add("sfx-power-attack"),
      explosion: this.sound.add("sfx-explosion"),
      monsterDeath: this.sound.add("sfx-monster-death"),
    };
  }

  showStartScreen() {
    this.isPaused = true;
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
      .text(480, 530, "Die Wüste erhebt sich...", {
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
      this.physics.world.resume();
      this.beginSession();
    };

    const duration = 2500;
    this.tweens.add({
      targets: this.startBarFill,
      displayWidth: barWidth - 4,
      duration,
      onComplete: () => resume(),
    });
  }

  beginSession() {
    this.spawnMonster("normal");
    this.createSpawners();
    this.startSpawners();
    this.scheduleEscalations();
  }

  createSpawners() {
    this.spawners.normal = new MonsterSpawner(this, {
      type: "normal",
      spawnRate: 6500,
      randomizer: 2500,
      locationMode: "random",
    });
    this.spawners.red = new MonsterSpawner(this, {
      type: "red",
      spawnRate: 16000,
      randomizer: 6000,
      locationMode: "random",
    });
    this.spawners.blue = new MonsterSpawner(this, {
      type: "blue",
      spawnRate: 16000,
      randomizer: 6000,
      locationMode: "random",
    });
    this.spawners.boss = new MonsterSpawner(this, {
      type: "boss",
      spawnRate: 180000,
      randomizer: 0,
      locationMode: "random",
      once: true,
    });
  }

  startSpawners() {
    this.spawners.normal.triggerSpawning();
  }

  scheduleEscalations() {
    this.redUnlockEvent = this.time.delayedCall(60000, () => {
      this.redUnlocked = true;
      this.typeIntroducedCount += 1;
      this.applySpawnPenalty();
      this.spawners.red.triggerSpawning();
      bumpMusicRate();
    });
    this.blueUnlockEvent = this.time.delayedCall(120000, () => {
      this.blueUnlocked = true;
      this.typeIntroducedCount += 1;
      this.applySpawnPenalty();
      this.spawners.blue.triggerSpawning();
      bumpMusicRate();
    });
    this.bossWarningEvent = this.time.delayedCall(176000, () => {
      this.showDanger(4000, true);
    });
    this.bossEvent = this.time.delayedCall(180000, () => {
      if (this.bossSpawned) return;
      this.bossSpawned = true;
      this.typeIntroducedCount += 1;
      this.applySpawnPenalty();
      this.spawners.boss.triggerSpawning();
      bumpMusicRate();
    });
  }

  applySpawnPenalty() {
    const penalty = this.typeIntroducedCount * 10000;
    this.spawners.normal.setSpawnRate(6500 + penalty);
    if (this.redUnlocked) this.spawners.red.setSpawnRate(16000 + penalty);
    if (this.blueUnlocked) this.spawners.blue.setSpawnRate(16000 + penalty);
  }

  showDanger(duration, wobble) {
    if (this.dangerText) {
      this.dangerText.destroy();
      this.dangerText = null;
    }
    const text = this.add
      .text(480, 300, "GEFAHR", {
        fontFamily: "Georgia, serif",
        fontSize: "48px",
        color: "#d12b2b",
      })
      .setOrigin(0.5)
      .setDepth(50);
    this.dangerText = text;
    text.setScale(0.8);
    text.setAlpha(0.9);
    this.tweens.add({
      targets: text,
      scale: 1.6,
      alpha: 0,
      duration,
      ease: "Sine.easeOut",
      onComplete: () => {
        if (text.active) text.destroy();
        if (this.dangerText === text) this.dangerText = null;
      },
    });
    if (wobble) {
      this.tweens.add({
        targets: text,
        angle: 6,
        duration: 80,
        yoyo: true,
        repeat: Math.floor(duration / 160),
      });
    }
  }

  stopEndlessTimers() {
    [
      "normalSpawnEvent",
      "redSpawnEvent",
      "blueSpawnEvent",
      "redUnlockEvent",
      "blueUnlockEvent",
      "bossWarningEvent",
      "bossEvent",
    ].forEach((key) => {
      if (this[key]) {
        this[key].remove(false);
        this[key] = null;
      }
    });
    Object.values(this.spawners || {}).forEach((spawner) => spawner.stop());
  }

  createRespawnTimers() {
    this.chestSpawnEvent = this.time.addEvent({
      delay: 6000,
      loop: true,
      callback: () => this.spawnChest(),
    });
    this.fruitSpawnEvent = this.time.addEvent({
      delay: 40000,
      loop: true,
      callback: () => this.spawnFruit(),
    });
  }

  createTunnel() {
    this.tunnelSprite = this.add.image(960, 600, "desert-ruin").setOrigin(1, 1);
    const targetWidth = 360;
    const scale = (targetWidth / this.tunnelSprite.width) * 0.5;
    this.tunnelSprite.setScale(scale);
    const entranceWidth = this.tunnelSprite.displayWidth * 0.36;
    const entranceHeight = this.tunnelSprite.displayHeight * 0.72;
    this.tunnelEntrance = this.add.rectangle(
      960 - entranceWidth / 2,
      600 - entranceHeight / 2,
      entranceWidth,
      entranceHeight,
      0x000000,
      0
    );
    this.physics.add.existing(this.tunnelEntrance, true);
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
      if (this.sfx?.eating) {
        this.sfx.eating.play();
      }
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

  createStonePiles() {
    this.stonePiles = this.physics.add.staticGroup();
    this.stonePileSpots = [
      { x: 140, y: 260 },
      { x: 320, y: 480 },
      { x: 520, y: 220 },
      { x: 680, y: 380 },
      { x: 820, y: 260 },
    ];
    this.stonePileSpots.forEach((spot) => {
      const pile = this.add.image(spot.x, spot.y, "desert-stone-pile");
      pile.setScale(0.9);
      this.physics.add.existing(pile, true);
      this.stonePiles.add(pile);
    });
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
  }

  createMonsters() {
    this.monsters = this.physics.add.group();

    this.physics.add.overlap(this.player, this.monsters, (player, monster) => {
      this.handlePlayerHit(player, monster);
    });

    this.physics.add.overlap(this.companion, this.monsters, (companion, monster) => {
      this.handleCompanionInteraction(companion, monster);
    });
  }

  createSword() {
    this.swordHitbox = this.add.rectangle(0, 0, 54, 38, 0xfff2d0, 0.2);
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

    this.physics.add.overlap(this.swordHitbox, this.stonePiles, () => {
      this.registerSwordHit();
      this.addStones(10);
    });
  }

  createMonsterBar(monster) {
    const isBoss = monster.getData("type") === "boss";
    const barScale = isBoss ? 3 : 1;
    const barYOffset = isBoss ? 57 : 22;
    const barHeight = isBoss ? 12 : 6;
    const barFillHeight = isBoss ? 8 : 4;
    const barBg = this.add.rectangle(
      monster.x,
      monster.y - barYOffset,
      30 * barScale,
      barHeight,
      0x2f1e14
    );
    const barFill = this.add.rectangle(
      monster.x,
      monster.y - barYOffset,
      28 * barScale,
      barFillHeight,
      0xc23a2c
    );
    barBg.setOrigin(0.5);
    barFill.setOrigin(0.5);
    barBg.setDepth(5);
    barFill.setDepth(6);
    monster.setData("barBg", barBg);
    monster.setData("barFill", barFill);
    monster.setData("barScale", barScale);
    monster.setData("barYOffset", barYOffset);
    this.updateMonsterBar(monster);
  }

  updateMonsterBar(monster) {
    const barBg = monster.getData("barBg");
    const barFill = monster.getData("barFill");
    if (!barBg || !barFill) return;
    const maxHp = monster.getData("maxHp") || 3;
    const hp = monster.getData("hp") || 0;
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    const barScale = monster.getData("barScale") || 1;
    const barFillHeight = monster.getData("type") === "boss" ? 8 : 4;
    barFill.setDisplaySize(28 * barScale * ratio, barFillHeight);
  }

  destroyMonsterBar(monster) {
    const barBg = monster.getData("barBg");
    const barFill = monster.getData("barFill");
    if (barBg) barBg.destroy();
    if (barFill) barFill.destroy();
  }

  updateMonsterBarPosition(monster) {
    const barBg = monster.getData("barBg");
    const barFill = monster.getData("barFill");
    if (!barBg || !barFill) return;
    const offsetY = monster.y - (monster.getData("barYOffset") || 22);
    barBg.setPosition(monster.x, offsetY);
    barFill.setPosition(monster.x, offsetY);
  }

  spawnMonster(type = "normal", locationMode = "random", fixedPosition = null) {
    if (this.isGameOver || this.isPaused || this.isComplete) return;
    const margin = 60;
    let x = Phaser.Math.Between(margin, 960 - margin);
    let y = Phaser.Math.Between(120, 430);
    if (locationMode === "fixed" && fixedPosition) {
      x = fixedPosition.x ?? x;
      y = fixedPosition.y ?? y;
    }

    const color =
      type === "red"
        ? 0xff5a5a
        : type === "blue"
          ? 0x4aa3ff
          : type === "boss"
            ? 0xf5d37a
            : 0xffffff;
    const baseHp = type === "red" ? 3 : type === "blue" ? 6 : type === "boss" ? 20 : 3;
    const scaleMultiplier = type === "boss" ? 2.4 : 1;
    const speedMultiplier =
      type === "red" ? 1.4 : type === "blue" ? 0.8 : type === "boss" ? 1.1 : 1;

    const monster = this.add.image(x, y, "desert-mole-digging").setOrigin(0.5);
    monster.setDepth(5);
    monster.setScale(this.monsterEmergingScale * scaleMultiplier);
    monster.setTint(color);
    this.physics.add.existing(monster);
    monster.body.setSize(monster.displayWidth * 0.5, monster.displayHeight * 0.5, true);
    monster.setData("type", type);
    monster.setData("baseTint", color);
    monster.setData("maxHp", baseHp);
    monster.setData("hp", baseHp);
    monster.setData("speed", Phaser.Math.Between(60, 90) * speedMultiplier);
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
      this.activeDigSounds.add(digSound);
    }
    this.monsters.add(monster);

    this.tweens.add({
      targets: monster,
      alpha: 1,
      scale: this.monsterScale * scaleMultiplier,
      duration: 2000,
      onComplete: () => {
        if (monster.active) {
          monster.setData("emerging", false);
          monster.setTexture("desert-mole-running");
          monster.setScale(this.monsterScale * scaleMultiplier);
          monster.body.setSize(monster.displayWidth * 0.5, monster.displayHeight * 0.5, true);
          const digSound = monster.getData("digSound");
          if (digSound) {
            digSound.stop();
            digSound.destroy();
            monster.setData("digSound", null);
            this.activeDigSounds.delete(digSound);
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

    this.time.delayedCall(10000, () => {
      if (!chest.active || chest.getData("opened")) return;
      this.startChestBlink(chest, spotIndex);
    });
  }

  startChestBlink(chest, slotIndex) {
    if (!chest.active || chest.getData("opened")) return;
    chest.setData("blinkActive", true);
    chest.setData("blinkInterval", 600);
    const blinkEvent = this.time.addEvent({
      delay: 600,
      loop: true,
      callback: () => {
        if (!chest.active || chest.getData("opened")) {
          blinkEvent.remove(false);
          return;
        }
        chest.setVisible(false);
        this.time.delayedCall(50, () => {
          if (!chest.active || chest.getData("opened")) return;
          chest.setVisible(true);
        });
        const nextInterval = Math.max(120, chest.getData("blinkInterval") - 40);
        chest.setData("blinkInterval", nextInterval);
        blinkEvent.delay = nextInterval;
      },
    });
    chest.setData("blinkEvent", blinkEvent);
    this.time.delayedCall(5000, () => {
      if (!chest.active || chest.getData("opened")) return;
      if (slotIndex !== undefined) {
        this.chestSlots[slotIndex] = false;
      }
      const event = chest.getData("blinkEvent");
      if (event) event.remove(false);
      chest.destroy();
    });
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

    this.addCoins(10);
    if (this.sfx) {
      this.sfx.coin.play();
    }

    chest.setTexture("chest-open");
    const blinkEvent = chest.getData("blinkEvent");
    if (blinkEvent) {
      blinkEvent.remove(false);
    }
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
    if (this.hud) {
      this.hud.setCoins(this.coinsCollected);
    }
    this.saveInventory();
  }

  addStones(amount) {
    this.stonesCollected += amount;
    if (this.hud) {
      this.hud.setStones(this.stonesCollected);
    }
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
    if (!this.hud) return;
    const result = this.hud.tryUseHoney({
      count: this.consumables?.honey ?? 0,
      health: this.health,
      maxHealth: this.maxHealth,
      companionHealth: this.companionHealth,
      companionRespawnAt: this.companionRespawnAt,
    });
    if (!result.consumed) return;
    this.health = result.health;
    this.companionHealth = result.companionHealth;
    this.companionRespawnAt = result.companionRespawnAt;
    this.consumables.honey = result.count;
    if (this.companionHealth > 0 && this.companionRespawnAt === 0 && !this.companion.visible) {
      this.companion.clearTint();
      this.stopCompanionRetreatBlink();
      this.companion.setVisible(true);
      this.companion.body.setEnable(true);
      const followPos = this.getCompanionFollowPosition();
      this.companion.setPosition(followPos.x, followPos.y);
      this.companion.setData("state", "follow");
      this.setCompanionVisual("running");
    }
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
    this.attemptMonsterAttack(monster, this.player);
  }

  handleCompanionInteraction(_, monster) {
    this.attemptMonsterAttack(monster, this.companion);
  }

  setMonsterAttack(monster, target) {
    if (!monster.active || monster.getData("emerging")) return;
    if (monster.getData("type") === "boss") {
      this.setBossAttack(monster, target);
      return;
    }
    monster.setTexture("desert-mole-attacking");
    if (target) {
      monster.setFlipX(target.x > monster.x);
    }
    monster.setData("attackUntil", this.time.now + 200);
    monster.body.setSize(monster.displayWidth * 0.5, monster.displayHeight * 0.5, true);
  }

  setBossAttack(monster, target) {
    if (monster.getData("isWindingUp")) return;
    const now = this.time.now;
    monster.setData("isWindingUp", true);
    monster.setTexture("desert-mole-charging");
    if (this.sfx?.charging) {
      this.sfx.charging.play();
    }
    if (target) {
      monster.setFlipX(target.x > monster.x);
    }
    monster.setData("attackUntil", now + 700);
    monster.setData("stunnedUntil", Math.max(monster.getData("stunnedUntil") || 0, now + 500));
    monster.body.setVelocity(0, 0);
    monster.body.setSize(monster.displayWidth * 0.5, monster.displayHeight * 0.5, true);
    this.time.delayedCall(500, () => {
      if (!monster.active) return;
      monster.setData("isWindingUp", false);
      monster.setData("bossAttackPoseUntil", this.time.now + 200);
      this.time.delayedCall(200, () => this.applyBossStun(monster));
      this.time.delayedCall(100, () => this.shakeCameraBurst());
      this.playBossAttackSound();
      this.executeMonsterAttack(monster, target, 2, { allowMiss: true });
    });
  }

  executeMonsterAttack(monster, target, damage = 1, options = {}) {
    if (!monster.active || monster.getData("emerging")) return;
    if (!target || !target.active) return;
    if (this.getMonsterTarget(monster) !== target) return;
    if (monster.getData("type") === "boss") {
      const distance = Phaser.Math.Distance.Between(monster.x, monster.y, target.x, target.y);
      const targetRadius = (target.body?.width ?? target.displayWidth) * 0.5;
      const monsterRadius = (monster.body?.width ?? monster.displayWidth) * 0.5;
      const desiredDistance = targetRadius + monsterRadius + this.monsterAttackRange;
      if (distance > desiredDistance) {
        return;
      }
    }
    if (target === this.companion) {
      const invulnerableUntil = this.companion.getData("invulnerableUntil") || 0;
      if (this.time.now < invulnerableUntil) return;
    }
    if (options.allowMiss !== true && Phaser.Math.FloatBetween(0, 1) > this.monsterHitChance) {
      if (this.sfx) {
        this.sfx.monsterMiss.play();
      }
      return;
    }

    if (target === this.player) {
      this.damagePlayer(damage);
      this.flashEntity(this.player, 0xa33b2b);
    } else if (target === this.companion) {
      this.damageCompanion();
    }
    if (this.sfx && monster.getData("type") !== "boss") {
      this.sfx.monsterAttack.play();
    }
  }

  playBossAttackSound() {
    if (this.sfx?.powerAttack) {
      this.sfx.powerAttack.play();
    }
  }

  shakeCamera() {
    if (!this.cameras?.main) return;
    this.cameras.main.shake(200, 0.008);
  }

  shakeCameraBurst() {
    this.shakeCamera();
    this.time.delayedCall(140, () => this.shakeCamera());
  }

  applyBossStun(monster) {
    const now = this.time.now;
    monster.setData("powerStunUntil", Math.max(monster.getData("powerStunUntil") || 0, now + 2000));
    monster.body.setVelocity(0, 0);
  }

  attemptMonsterAttack(monster, target) {
    if (this.isGameOver || this.isPaused || this.isComplete) return;
    if (!monster || !monster.active || monster.getData("emerging")) return;
    if (!target || !target.active) return;
    if (this.getMonsterTarget(monster) !== target) return;
    const now = this.time.now;
    if (now < (monster.getData("stunnedUntil") || 0)) return;
    if (monster.getData("type") === "boss") {
      const powerStunUntil = monster.getData("powerStunUntil") || 0;
      if (now < powerStunUntil) return;
    }
    if (target === this.companion) {
      const invulnerableUntil = this.companion.getData("invulnerableUntil") || 0;
      if (this.time.now < invulnerableUntil) return;
    }
    if (monster.getData("nextAttackAt") > now) return;

    monster.setData("nextAttackAt", now + this.monsterAttackCooldown);
    this.setMonsterAttack(monster, target);
    if (monster.getData("type") === "boss") {
      return;
    }
    this.executeMonsterAttack(monster, target);
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
    const baseTint = monster.getData("baseTint");
    if (baseTint !== undefined && baseTint !== null) {
      this.time.delayedCall(120, () => {
        if (monster.active) {
          monster.setTint(baseTint);
        }
      });
    }
    if (nextHp <= 0) {
      if (this.sfx?.monsterDeath) {
        this.time.delayedCall(50, () => this.sfx?.monsterDeath?.play());
      }
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
      this.activeDigSounds.delete(digSound);
    }
    this.destroyMonsterBar(monster);
    if (this.companion.getData("target") === monster) {
      this.companion.setData("target", null);
      this.companion.setData("state", "follow");
    }
    if (monster.getData("type") === "boss" && !this.isComplete) {
      this.playBossDefeat(monster);
      return;
    }
    monster.destroy();
  }

  playBossDefeat(monster) {
    this.isComplete = true;
    this.stopEndlessTimers();
    const explosions = 15;
    for (let i = 0; i < explosions; i += 1) {
      this.time.delayedCall(150 * i, () => {
        if (!monster.active) return;
        const offsetX = Phaser.Math.Between(-40, 40);
        const offsetY = Phaser.Math.Between(-30, 30);
        const burst = this.add.circle(monster.x + offsetX, monster.y + offsetY, 10, 0xf6c04d);
        burst.setDepth(20);
        this.tweens.add({
          targets: burst,
          scale: 1.6,
          alpha: 0,
          duration: 200,
          onComplete: () => burst.destroy(),
        });
        if (this.sfx?.explosion) {
          this.sfx.explosion.play();
        }
      });
    }
    this.tweens.add({
      targets: monster,
      alpha: 0,
      duration: 600,
      onComplete: () => {
        if (monster.active) monster.destroy();
        this.time.delayedCall(1500, () => this.showEndScreen());
      },
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
      .setStroke("#433320", 3);
    this.physics.world.pause();
    if (this.chestSpawnEvent) {
      this.chestSpawnEvent.remove(false);
    }
    if (this.fruitSpawnEvent) {
      this.fruitSpawnEvent.remove(false);
    }
    this.stopEndlessTimers();
    this.stopAllSounds();
    if (this.sfx) {
      this.sfx.gameOver.play();
    }

    const saveData = this.registry.get("saveData");
    const nextSave = {
      ...saveData,
      currentLevel: "Fremdweg",
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
    if (this.chestSpawnEvent) {
      this.chestSpawnEvent.remove(false);
    }
    if (this.fruitSpawnEvent) {
      this.fruitSpawnEvent.remove(false);
    }
    this.stopEndlessTimers();
    this.stopAllSounds();
    if (this.sfx) {
      this.sfx.success.play();
    }

    const saveData = this.registry.get("saveData");
    const nextSave = {
      ...saveData,
      currentLevel: "Fremdweg",
      completedLevels: Array.from(
        new Set([...(saveData.completedLevels || []), "Fremdweg"])
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
      .setStroke("#433320", 3);

    this.input.keyboard.once("keydown-ENTER", () => {
      this.scene.start("WorldMapScene");
    });
  }

  fitScreenImage(image, marginScale) {
    const targetScale = Math.min(960 / image.width, 600 / image.height) * marginScale;
    image.setScale(targetScale);
  }

  openExitPrompt() {
    if (this.isPromptActive || this.isComplete || this.isGameOver) return;
    this.isPaused = true;
    this.player.body.setVelocity(0, 0);
    this.time.paused = true;
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
        this.time.paused = false;
      }
    };

    const onYes = () => {
      closePrompt(false);
      this.time.paused = false;
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
    this.applyAutoAim();

    if (this.isSwinging) {
      this.positionSword();
    }

    const isOnTunnel = Phaser.Geom.Intersects.RectangleToRectangle(
      this.player.getBounds(),
      this.tunnelEntrance.getBounds()
    );
    if (!isOnTunnel) {
      this.canPromptTunnel = true;
    } else if (this.canPromptTunnel) {
      this.canPromptTunnel = false;
      this.openTunnelPrompt();
    }

    this.monsters.getChildren().forEach((monster) => {
      this.updateMonsterBarPosition(monster);
      if (monster.getData("emerging")) {
        monster.body.setVelocity(0, 0);
        return;
      }
      const powerStunUntil = monster.getData("powerStunUntil") || 0;
      if (this.time.now < powerStunUntil && monster.getData("type") === "boss") {
        if (monster.texture.key !== "desert-mole-stunned") {
          monster.setTexture("desert-mole-stunned");
          monster.body.setSize(monster.displayWidth * 0.5, monster.displayHeight * 0.5, true);
        }
        monster.body.setVelocity(0, 0);
        return;
      }
      const attackUntil = monster.getData("attackUntil") || 0;
      if (this.time.now < attackUntil) {
        const bossPoseUntil = monster.getData("bossAttackPoseUntil") || 0;
        const attackTexture =
          monster.getData("type") === "boss"
            ? bossPoseUntil > this.time.now
              ? "desert-mole-attacking"
              : "desert-mole-charging"
            : "desert-mole-attacking";
        if (monster.texture.key !== attackTexture) {
          monster.setTexture(attackTexture);
          monster.body.setSize(monster.displayWidth * 0.5, monster.displayHeight * 0.5, true);
        }
      } else if (monster.texture.key !== "desert-mole-running") {
        monster.setTexture("desert-mole-running");
        monster.body.setSize(monster.displayWidth * 0.5, monster.displayHeight * 0.5, true);
      }
      const stunnedUntil = monster.getData("stunnedUntil") || 0;
      if (this.time.now < stunnedUntil) {
        return;
      }
      const speedValue = monster.getData("speed") || 70;
      const target = this.getMonsterTarget(monster);
      const direction = new Phaser.Math.Vector2(target.x - monster.x, target.y - monster.y);
      const distance = direction.length();
      const targetRadius = (target.body?.width ?? target.displayWidth) * 0.5;
      const monsterRadius = (monster.body?.width ?? monster.displayWidth) * 0.5;
      const desiredDistance = targetRadius + monsterRadius + this.monsterAttackRange;

      if (distance <= desiredDistance) {
        monster.body.setVelocity(0, 0);
        this.attemptMonsterAttack(monster, target);
        return;
      }

      if (distance > 0) {
        monster.setFlipX(direction.x > 0);
        direction.normalize();
      }
      monster.body.setVelocity(direction.x * speedValue, direction.y * speedValue);
    });
  }

  getMonsterTarget(monster) {
    if (monster.getData("type") === "boss") {
      return this.player;
    }
    const companionState = this.companion.getData("state");
    const companionAttackLocked =
      companionState === "attack-approach" || companionState === "attack-return";
    if (
      this.companion.visible &&
      this.companion.body.enable &&
      !companionAttackLocked &&
      !this.companion.getData("fetching")
    ) {
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

  updateCompanion() {
    const state = this.companion.getData("state");
    if (state === "hidden") {
      if (this.companionFruit) {
        this.companionFruit.setVisible(false);
      }
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
      this.moveCompanionToward(this.player.x, this.player.y, this.helperSpeed * 2);
      return;
    }

    if (state === "attack-approach" || state === "attack-return") {
      this.setCompanionVisual("attacking");
      return;
    }

    if (state === "fetching") {
      this.setCompanionVisual("running");
      const fruit = this.companion.getData("fruitTarget");
      if (!fruit || !fruit.active) {
        this.finishCompanionFetch();
        return;
      }
      const distance = Phaser.Math.Distance.Between(
        this.companion.x,
        this.companion.y,
        fruit.x,
        fruit.y
      );
      if (distance <= 12) {
        this.pickupFruit(fruit);
        this.companion.setData("state", "returning-fruit");
        this.companion.setData("fruitTarget", null);
        return;
      }
      this.moveCompanionToward(fruit.x, fruit.y, this.helperSpeed);
      return;
    }

    if (state === "returning-fruit") {
      this.setCompanionVisual("running");
      const distance = Phaser.Math.Distance.Between(
        this.companion.x,
        this.companion.y,
        this.player.x,
        this.player.y
      );
      if (distance <= 14) {
        this.giveFruitToPlayer();
        this.finishCompanionFetch();
        return;
      }
      this.moveCompanionToward(this.player.x, this.player.y, this.helperSpeed);
      this.updateCompanionFruitPosition();
      return;
    }

    if (this.health < this.maxHealth) {
      const fruitTarget = this.findNearestFruit();
      if (fruitTarget) {
        this.startCompanionFetch(fruitTarget);
        return;
      }
    }

    if (state === "returning") {
      const followPos = this.getCompanionFollowPosition();
      const distance = Phaser.Math.Distance.Between(
        this.companion.x,
        this.companion.y,
        followPos.x,
        followPos.y
      );
      if (distance <= this.helperFollowDistance) {
        this.companion.body.setVelocity(0, 0);
        this.companion.setData("state", "cooldown");
        return;
      }
      this.setCompanionVisual("running");
      this.moveCompanionToward(followPos.x, followPos.y, this.helperSpeed);
      return;
    }

    if (state === "cooldown") {
      const nextHitAt = this.companion.getData("nextHitAt") || 0;
      if (this.time.now >= nextHitAt) {
        this.companion.setData("state", "follow");
      } else {
        this.followCompanion();
        return;
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
          const distance = Phaser.Math.Distance.Between(
            this.companion.x,
            this.companion.y,
            target.x,
            target.y
          );
          if (distance <= this.helperAttackRange) {
            this.startCompanionAttack(target);
            return;
          }
          this.setCompanionVisual("running");
          this.moveCompanionToward(target.x, target.y, this.helperSpeed);
          return;
        }
      } else {
        this.setCompanionDetected(target);
        this.followCompanion();
      }
    } else {
      this.companion.setData("state", "follow");
      this.followCompanion();
    }
    this.updateCompanionFruitPosition();
  }

  startCompanionFetch(fruit) {
    this.companion.setData("state", "fetching");
    this.companion.setData("fruitTarget", fruit);
    this.companion.setData("fetching", true);
  }

  finishCompanionFetch() {
    this.companion.setData("fetching", false);
    this.companion.setData("state", "follow");
  }

  updateCompanionFruitPosition() {
    if (!this.companionFruit || !this.companionFruit.visible) return;
    this.companionFruit.setPosition(this.companion.x + 8, this.companion.y - 8);
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
    const side = this.companion.x >= this.player.x ? 1 : -1;
    const sideOffset = Math.max(18, this.companion.displayWidth * 0.45);
    const footY = this.player.y + this.player.displayHeight * 0.38;
    return {
      x: this.player.x + side * sideOffset,
      y: footY,
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

  findNearestFruit() {
    let nearest = null;
    let nearestDistance = this.helperFruitRange;
    this.fruits.getChildren().forEach((fruit) => {
      if (!fruit.active) return;
      const distance = Phaser.Math.Distance.Between(
        this.companion.x,
        this.companion.y,
        fruit.x,
        fruit.y
      );
      if (distance <= nearestDistance) {
        nearest = fruit;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  pickupFruit(fruit) {
    if (!fruit.active) return;
    const slot = fruit.getData("slot");
    if (slot !== undefined) {
      this.fruitSlots[slot] = false;
    }
    fruit.destroy();
    if (this.companionFruit) {
      this.companionFruit.setVisible(true);
      this.updateCompanionFruitPosition();
    }
  }

  giveFruitToPlayer() {
    if (this.health >= this.maxHealth) return;
    this.health = Math.min(this.maxHealth, this.health + 1);
    if (this.sfx?.eating) {
      this.sfx.eating.play();
    }
    if (this.companionFruit) {
      this.companionFruit.setVisible(false);
    }
    this.updateHearts();
    this.saveInventory();
  }

  hideCompanion() {
    this.companion.setData("state", "hidden");
    this.companion.setVisible(false);
    this.companion.body.setEnable(false);
    this.companion.setPosition(this.player.x, this.player.y);
    this.companion.clearTint();
    if (this.companionFruit) {
      this.companionFruit.setVisible(false);
    }
    this.companionRespawnAt = this.time.now + this.helperHideDuration;
    this.updateItemUI();
    this.time.delayedCall(this.helperHideDuration, () => {
      if (this.isGameOver || this.isComplete) return;
      const followPos = this.getCompanionFollowPosition();
      this.companion.clearTint();
      this.stopCompanionRetreatBlink();
      this.companion.setVisible(true);
      this.companion.body.setEnable(true);
      this.companion.setPosition(followPos.x, followPos.y);
      this.companion.setData("state", "follow");
      this.setCompanionVisual("running");
      this.companionHealth = 1;
      this.companionRespawnAt = 0;
      if (this.companionFruit) {
        this.companionFruit.setVisible(false);
      }
      this.updateItemUI();
    });
  }

  damageCompanion() {
    if (!this.companion.visible || !this.companion.body.enable) return;
    if (this.companion.getData("fetching")) return;
    if (this.companionHealth <= 0) return;
    const now = this.time.now;
    if (now < (this.companion.getData("invulnerableUntil") || 0)) return;
    this.companionHealth = 0;
    this.updateItemUI();
    this.flashEntity(this.companion, 0xff7a7a);
    this.startCompanionRetreatBlink();
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

  startCompanionRetreatBlink() {
    this.stopCompanionRetreatBlink();
    this.companion.setData("retreatBlinking", true);
    const blink = this.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        const isRed = this.companion.getData("blinkRed") || false;
        if (isRed) {
          this.companion.clearTint();
        } else {
          this.companion.setTint(0xff4d4d);
        }
        this.companion.setData("blinkRed", !isRed);
      },
    });
    this.companion.setData("blinkEvent", blink);
  }

  stopCompanionRetreatBlink() {
    const blinkEvent = this.companion.getData("blinkEvent");
    if (blinkEvent) {
      blinkEvent.remove();
      this.companion.setData("blinkEvent", null);
    }
    const blinkTween = this.companion.getData("blinkTween");
    if (blinkTween) {
      blinkTween.stop();
      this.companion.setData("blinkTween", null);
    }
    this.companion.setData("blinkRed", false);
    this.companion.setAlpha(1);
    this.companion.setData("retreatBlinking", false);
    this.companion.clearTint();
  }

  startCompanionAttack(target) {
    this.companion.setData("state", "attack-approach");
    this.companion.setData("target", target);
    this.companion.setData("attackStart", { x: this.companion.x, y: this.companion.y });
    this.setCompanionVisual("attacking");
    this.stopCompanionRetreatBlink();
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
    const followPos = this.companion.getData("attackStart") || this.getCompanionFollowPosition();
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
        const now = this.time.now;
        this.companion.setData("state", "returning");
        this.companion.setData("nextHitAt", now + this.helperAttackCooldown);
        this.companion.setData("invulnerableUntil", now + this.helperInvulnDuration);
        this.companion.setData("attackStart", null);
      },
    });
  }

  updateItemUI() {
    if (!this.hud) return;
    this.hud.setConsumableCount(this.consumables?.honey ?? 0);
    this.hud.setCompanionStatus({
      health: this.companionHealth,
      respawnRatio: this.companionRespawnAt
        ? 1 - Math.min(1, (this.companionRespawnAt - this.time.now) / this.helperHideDuration)
        : 0,
    });
    this.hud.setStones(this.stonesCollected);
  }

  updateHearts() {
    if (this.hud) {
      this.hud.setHealth(this.health, this.maxHealth);
    }
  }

  findNearestFruitTarget() {
    let nearest = null;
    let nearestDistance = this.helperFruitRange;
    this.fruits.getChildren().forEach((fruit) => {
      if (!fruit.active) return;
      const distance = Phaser.Math.Distance.Between(
        this.companion.x,
        this.companion.y,
        fruit.x,
        fruit.y
      );
      if (distance <= nearestDistance) {
        nearest = fruit;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  startCompanionFetch(fruit) {
    this.companion.setData("state", "fetching");
    this.companion.setData("fruitTarget", fruit);
    this.companion.setData("fetching", true);
  }

  finishCompanionFetch() {
    this.companion.setData("fetching", false);
    this.companion.setData("state", "follow");
  }

  openTunnelPrompt() {
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

    if (this.stonesCollected < this.tunnelCost) {
      this.promptText.setText(
        `Leider hast du nicht genug Steine.\nSammel ${this.tunnelCost} Stück, um den Tunnel zu bauen.`
      );
      this.promptHint.setText("Beliebige Taste zum Weiterspielen");
      this.input.keyboard.once("keydown", () => closePrompt(true));
      return;
    }

    this.promptText.setText(`Tunnel bauen für ${this.tunnelCost} Steine?`);
    this.promptHint.setText("[J]a oder [N]ein");

    onNo = () => closePrompt(true);
    onYes = () => {
      this.stonesCollected -= this.tunnelCost;
      if (this.hud) {
        this.hud.setStones(this.stonesCollected);
      }
      closePrompt(true);
      this.showEndScreen();
    };

    this.input.keyboard.once("keydown-J", onYes);
    this.input.keyboard.once("keydown-N", onNo);
  }

  updateCompanionUI() {
    if (!this.hud) return;
    this.hud.setCompanionStatus({
      health: this.companionHealth,
      respawnRatio: this.companionRespawnAt
        ? 1 - Math.min(1, (this.companionRespawnAt - this.time.now) / this.helperHideDuration)
        : 0,
    });
  }

  startCompanionRetreatBlink() {
    this.stopCompanionRetreatBlink();
    this.companion.setData("retreatBlinking", true);
    const blink = this.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        const isRed = this.companion.getData("blinkRed") || false;
        if (isRed) {
          this.companion.clearTint();
        } else {
          this.companion.setTint(0xff4d4d);
        }
        this.companion.setData("blinkRed", !isRed);
      },
    });
    this.companion.setData("blinkEvent", blink);
  }

  stopCompanionRetreatBlink() {
    const blinkEvent = this.companion.getData("blinkEvent");
    if (blinkEvent) {
      blinkEvent.remove();
      this.companion.setData("blinkEvent", null);
    }
    const blinkTween = this.companion.getData("blinkTween");
    if (blinkTween) {
      blinkTween.stop();
      this.companion.setData("blinkTween", null);
    }
    this.companion.setData("blinkRed", false);
    this.companion.setAlpha(1);
    this.companion.setData("retreatBlinking", false);
    this.companion.clearTint();
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

  setCompanionDetected(target) {
    const now = this.time.now;
    const detectedUntil = this.companion.getData("detectedUntil") || 0;
    if (now > detectedUntil) {
      this.companion.setData(
        "detectedUntil",
        now + this.companionDetectedDuration + this.companionDetectedDelay
      );
      this.companion.setData("detectedStart", now);
    }
    if (this.canStartDetectedChase()) {
      this.setCompanionVisual("detected");
    } else {
      this.setCompanionVisual("searching");
    }
    if (target) {
      this.companion.setFlipX(target.x < this.companion.x);
    }
  }

  applyAutoAim() {
    if (!this.autoAimEnabled || !this.monsters) return;
    let nearest = null;
    let bestDistance = Infinity;
    this.monsters.getChildren().forEach((monster) => {
      if (!monster.active || monster.getData("emerging")) return;
      const dx = monster.x - this.player.x;
      const dy = monster.y - this.player.y;
      if (Math.abs(dy) > this.autoAimRangeY) return;
      const absDx = Math.abs(dx);
      if (absDx > this.autoAimRangeX) return;
      const distance = absDx + Math.abs(dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = monster;
      }
    });
    if (!nearest) return;
    const dx = nearest.x - this.player.x;
    const direction = dx >= 0 ? 1 : -1;
    this.facing.set(direction, 0);
    this.player.setFlipX(direction > 0);
  }

  canStartDetectedChase() {
    const detectedStart = this.companion.getData("detectedStart") || 0;
    return this.time.now - detectedStart >= this.companionDetectedDelay;
  }

  spawnBossNow() {
    if (this.bossSpawned || this.isGameOver || this.isComplete) return;
    this.bossSpawned = true;
    this.typeIntroducedCount += 1;
    this.applySpawnPenalty();
    this.spawners.boss?.stop();
    this.spawners.boss?.triggerSpawning();
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

  stopAllSounds() {
    if (!this.sfx) return;
    Object.values(this.sfx).forEach((sound) => {
      if (sound && sound.isPlaying) {
        sound.stop();
      }
    });
  }
}
