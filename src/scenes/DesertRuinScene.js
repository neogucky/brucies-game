import { saveProgress } from "../saveManager.js";

export default class DesertRuinScene extends Phaser.Scene {
  constructor() {
    super({ key: "DesertRuinScene" });
    this.isGameOver = false;
    this.isPaused = false;
    this.ruinRepaired = false;
    this.maxHealth = 5;
    this.health = this.maxHealth;
    this.coinsCollected = 0;
    this.attackCooldown = 350;
    this.lastAttackAt = 0;
  }

  create() {
    this.addBackground();
    this.createPlayer();
    this.createRuin();
    this.createUI();
    this.createBushes();
    this.createCoins();
    this.createMonsters();
    this.createSword();
    this.createRespawnTimers();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on("keydown-SPACE", () => this.swingSword());
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("LevelSelectScene"));
  }

  addBackground() {
    this.add.rectangle(480, 300, 960, 600, 0xd7b779);
    this.add.rectangle(480, 460, 960, 280, 0xcaa263).setAlpha(0.95);

    this.add.rectangle(480, 520, 600, 120, 0x8c6a41).setAlpha(0.9);
    this.add.rectangle(480, 555, 520, 80, 0x6f5336).setAlpha(0.9);
    this.add.rectangle(480, 505, 180, 60, 0x7d5a38).setAlpha(0.9);
    this.add.rectangle(350, 520, 120, 50, 0x6a4d31).setAlpha(0.9);
    this.add.rectangle(610, 520, 120, 50, 0x6a4d31).setAlpha(0.9);

    this.add.circle(120, 120, 60, 0xf3d497).setAlpha(0.6);
    this.add.rectangle(800, 220, 220, 70, 0xd1b07a).setAlpha(0.5);
  }

  createPlayer() {
    this.player = this.add.rectangle(480, 420, 32, 48, 0x8e8e8e).setOrigin(0.5);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    this.companion = this.add.circle(0, 0, 10, 0xffe35c);
    this.facing = new Phaser.Math.Vector2(1, 0);
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
      const slot = fruit.getData("slot");
      if (slot !== undefined) {
        this.fruitSlots[slot] = false;
      }
      fruit.destroy();
      if (this.health < this.maxHealth) {
        this.health = Math.min(this.maxHealth, this.health + 1);
        this.updateHearts();
      }
    });

    this.fruitSlots = this.fruitSpots.map(() => false);
    for (let i = 0; i < Math.min(3, this.fruitSpots.length); i += 1) {
      this.spawnFruit();
    }
  }

  createCoins() {
    this.coins = this.physics.add.staticGroup();
    this.coinSpots = [
      { x: 160, y: 280 },
      { x: 300, y: 420 },
      { x: 430, y: 210 },
      { x: 560, y: 320 },
      { x: 700, y: 420 },
      { x: 800, y: 260 },
    ];
    this.coinSlots = this.coinSpots.map(() => false);

    this.physics.add.overlap(this.player, this.coins, (_, coin) => {
      const slot = coin.getData("slot");
      if (slot !== undefined) {
        this.coinSlots[slot] = false;
      }
      coin.destroy();
      this.coinsCollected += 1;
      this.coinText.setText(`Münzen: ${this.coinsCollected}`);
    });

    for (let i = 0; i < Math.min(4, this.coinSpots.length); i += 1) {
      this.spawnCoin();
    }
  }

  createMonsters() {
    this.monsters = this.physics.add.group();
    this.monsterSpawnEvent = this.time.addEvent({
      delay: 10000,
      loop: true,
      callback: () => this.spawnMonster(),
    });

    this.physics.add.overlap(this.player, this.monsters, (player, monster) => {
      this.handlePlayerHit(player, monster);
    });
  }

  createUI() {
    this.add
      .text(30, 30, "Level 1: Wüstenpfad", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "22px",
        color: "#59422a",
      })
      .setOrigin(0, 0.5);

    this.coinText = this.add
      .text(30, 60, "Münzen: 0", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "18px",
        color: "#59422a",
      })
      .setOrigin(0, 0.5);

    this.createHeartsUI();

    this.add
      .text(30, 560, "Pfeile bewegen, Leertaste schlägt zu. Früchte heilen.", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#6c5134",
      })
      .setOrigin(0, 0.5);

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
      .text(480, 300, "", {
        fontFamily: "Georgia, serif",
        fontSize: "22px",
        color: "#3b2a17",
        align: "center",
      })
      .setOrigin(0.5);
    this.promptBox.add([promptShade, promptPanel, this.promptText]);
  }

  createHeartsUI() {
    this.hearts = [];
    const spacing = 24;
    const startX = 930 - (this.maxHealth - 1) * spacing;

    for (let i = 0; i < this.maxHealth; i += 1) {
      const heart = this.createHeartIcon(startX + i * spacing, 30);
      this.hearts.push(heart);
    }

    this.updateHearts();
  }

  createHeartIcon(x, y) {
    const left = this.add.circle(-6, -2, 6, 0xc23a2c);
    const right = this.add.circle(6, -2, 6, 0xc23a2c);
    const tip = this.add.triangle(0, 6, -12, -4, 12, -4, 0, 12, 0xc23a2c);
    const container = this.add.container(x, y, [left, right, tip]);
    container.setSize(20, 20);
    container.setData("parts", [left, right, tip]);
    return container;
  }

  updateHearts() {
    this.hearts.forEach((heart, index) => {
      const filled = index < this.health;
      const color = filled ? 0xc23a2c : 0x6b5043;
      const parts = heart.getData("parts");
      parts.forEach((part) => part.setFillStyle(color, filled ? 1 : 0.6));
    });
  }

  createSword() {
    this.swordHitbox = this.add.rectangle(0, 0, 34, 18, 0xfff2d0, 0.2);
    this.physics.add.existing(this.swordHitbox);
    this.swordHitbox.body.setEnable(false);
    this.swordHitbox.setVisible(false);

    this.physics.add.overlap(this.swordHitbox, this.monsters, (_, monster) => {
      if (monster.getData("emerging")) return;
      monster.destroy();
    });
  }

  createRespawnTimers() {
    this.coinSpawnEvent = this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => this.spawnCoin(),
    });
    this.fruitSpawnEvent = this.time.addEvent({
      delay: 20000,
      loop: true,
      callback: () => this.spawnFruit(),
    });
  }

  createRuin() {
    const ruinCenterY = 520;
    this.add.rectangle(480, ruinCenterY, 600, 120, 0x8c6a41).setAlpha(0.9);
    this.add.rectangle(480, ruinCenterY + 35, 520, 80, 0x6f5336).setAlpha(0.9);

    this.ruinWalls = this.physics.add.staticGroup();
    const wallY = 530;
    const wallHeight = 60;
    const entranceWidth = 80;
    const wallWidth = (600 - entranceWidth) / 2;
    const leftWall = this.add.rectangle(480 - entranceWidth / 2 - wallWidth / 2, wallY, wallWidth, wallHeight, 0x6a4d31);
    const rightWall = this.add.rectangle(480 + entranceWidth / 2 + wallWidth / 2, wallY, wallWidth, wallHeight, 0x6a4d31);
    const backWall = this.add.rectangle(480, wallY - 50, 600, 20, 0x6a4d31);
    [leftWall, rightWall, backWall].forEach((wall) => {
      wall.setAlpha(0.9);
      this.physics.add.existing(wall, true);
      this.ruinWalls.add(wall);
    });

    this.physics.add.collider(this.player, this.ruinWalls);

    this.ruinEntrance = this.add.rectangle(480, 555, entranceWidth, 30, 0x000000, 0);
    this.physics.add.existing(this.ruinEntrance, true);
    this.physics.add.overlap(this.player, this.ruinEntrance, () => {
      if (this.isPaused || this.isGameOver || this.ruinRepaired) return;
      this.openRuinPrompt();
    });
  }

  spawnMonster() {
    if (this.isGameOver || this.isPaused) return;
    const margin = 60;
    const x = Phaser.Math.Between(margin, 960 - margin);
    const y = Phaser.Math.Between(120, 430);

    const monster = this.add.circle(x, y, 16, 0x9b5a2c);
    this.physics.add.existing(monster);
    monster.body.setCircle(16);
    monster.setData("speed", Phaser.Math.Between(60, 90));
    monster.setData("nextAttackAt", 0);
    monster.setData("emerging", true);
    monster.setAlpha(0.2);
    monster.setScale(0.4);
    this.monsters.add(monster);

    this.tweens.add({
      targets: monster,
      alpha: 1,
      scale: 1,
      duration: 2000,
      onComplete: () => {
        if (monster.active) {
          monster.setData("emerging", false);
        }
      },
    });
  }

  spawnCoin() {
    if (this.isGameOver || this.isPaused) return;
    const maxCoins = 4;
    if (this.coins.countActive(true) >= maxCoins) return;
    const available = this.coinSlots
      .map((slot, index) => (!slot ? index : null))
      .filter((slot) => slot !== null);
    if (available.length === 0) return;

    const spotIndex = Phaser.Math.RND.pick(available);
    const spot = this.coinSpots[spotIndex];
    const coin = this.add.circle(spot.x, spot.y, 8, 0xf5d37a);
    coin.setData("slot", spotIndex);
    this.physics.add.existing(coin, true);
    this.coins.add(coin);
    this.coinSlots[spotIndex] = true;
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

  handlePlayerHit(_, monster) {
    if (this.isGameOver || this.isPaused || monster.getData("emerging")) return;
    const now = this.time.now;
    if (monster.getData("nextAttackAt") > now) return;

    monster.setData("nextAttackAt", now + 800);
    this.damagePlayer(1);
  }

  damagePlayer(amount) {
    this.health = Math.max(0, this.health - amount);
    this.updateHearts();
    this.flashDamage();

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

    this.isSwinging = true;
    this.positionSword();
    this.swordHitbox.body.setEnable(true);
    this.swordHitbox.setVisible(true);

    this.time.delayedCall(140, () => {
      this.swordHitbox.body.setEnable(false);
      this.swordHitbox.setVisible(false);
      this.isSwinging = false;
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
    this.statusText.setText("Gefallen in der Wüste!\nEnter für Neustart");
    if (this.monsterSpawnEvent) {
      this.monsterSpawnEvent.remove(false);
    }
    if (this.coinSpawnEvent) {
      this.coinSpawnEvent.remove(false);
    }
    if (this.fruitSpawnEvent) {
      this.fruitSpawnEvent.remove(false);
    }

    const saveData = this.registry.get("saveData");
    const nextSave = {
      ...saveData,
      currentLevel: "Wuestenruine",
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);

    this.input.keyboard.once("keydown-ENTER", () => {
      this.scene.restart();
    });
  }

  openRuinPrompt() {
    this.isPaused = true;
    this.player.body.setVelocity(0, 0);
    this.physics.world.pause();
    this.promptText.setText("Die Ruine reparieren für 10 Münzen?\n[J]a oder [N]ein");
    this.promptBox.setVisible(true);

    const onNo = () => cleanup();
    const onYes = () => {
      if (this.coinsCollected >= 10) {
        this.coinsCollected -= 10;
        this.coinText.setText(`Münzen: ${this.coinsCollected}`);
        this.ruinRepaired = true;
        this.promptText.setText("Die Ruine ist repariert!");
        this.time.delayedCall(900, () => cleanup());
      } else {
        this.promptText.setText("Nicht genug Münzen.");
        this.time.delayedCall(900, () => cleanup());
      }
    };

    const cleanup = () => {
      this.input.keyboard.off("keydown-J", onYes);
      this.input.keyboard.off("keydown-N", onNo);
      this.promptBox.setVisible(false);
      this.physics.world.resume();
      this.isPaused = false;
    };

    this.input.keyboard.once("keydown-J", onYes);
    this.input.keyboard.once("keydown-N", onNo);
  }

  update() {
    if (this.isGameOver || this.isPaused) {
      this.player.body.setVelocity(0, 0);
      return;
    }

    const speed = 200;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown) vx -= speed;
    if (this.cursors.right.isDown) vx += speed;
    if (this.cursors.up.isDown) vy -= speed;
    if (this.cursors.down.isDown) vy += speed;

    this.player.body.setVelocity(vx, vy);

    this.companion.setPosition(this.player.x + 12, this.player.y - 10);

    const movementLength = Math.hypot(vx, vy);
    if (movementLength > 0) {
      this.facing.set(vx / movementLength, vy / movementLength);
    }

    if (this.isSwinging) {
      this.positionSword();
    }

    this.monsters.getChildren().forEach((monster) => {
      if (monster.getData("emerging")) {
        monster.body.setVelocity(0, 0);
        return;
      }
      const speedValue = monster.getData("speed") || 70;
      const direction = new Phaser.Math.Vector2(
        this.player.x - monster.x,
        this.player.y - monster.y
      ).normalize();
      monster.body.setVelocity(direction.x * speedValue, direction.y * speedValue);
    });
  }
}
