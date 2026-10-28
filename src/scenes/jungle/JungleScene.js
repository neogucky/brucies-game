import { canHelperDrink, companionDrinkTexture } from "../../utils/companionDrinking.js";
import { showExitConfirmation } from "../../ui/ConfirmationDialog.js";
import { saveProgress } from "../../saveManager.js";
import { queueDragonClue } from '../../utils/dragonStory.js';
import { playMusic } from "../../soundManager.js";
import TopHud from "../../ui/topHud.js";
import InventoryOverlay from "../../ui/InventoryOverlay.js";
import ShieldManager from "../../utils/ShieldManager.js";
import { applyInventoryToSave, normalizeInventory } from "../../utils/inventory.js";
import { getWeaponStats, getWeaponDamage, applyWeaponAppearance, getAttackStats, getMeleeDamage } from "../../utils/weapons.js";
import { applyItemModeSupport, GAME_MODES } from "../../utils/itemRegistry.js";
import { JUNGLE_LEVELS, JUNGLE_BRANCHES, JUNGLE_PHYSICS, MONKEY_TYPES, MONKEY_KING_THROWS,
  canLandOnBranch, circleTouchesRect, secondsLeft, planMonkeyClimb, advanceMonkeyClimb } from "../../utils/jungleRules.js";
import JungleHazards from "../../utils/JungleHazards.js";
import SecretSwitch from '../../utils/SecretSwitch.js';

const textStyle = { fontFamily: "Trebuchet MS, sans-serif", color: "#fff4ce",
  stroke: "#173d2c", strokeThickness: 4 };

export default class JungleScene extends Phaser.Scene {
  constructor() { super({ key: "JungleScene" }); }
  init(data) { this.levelId = JUNGLE_LEVELS[data?.levelId] ? data.levelId : "Urwaldkronen"; }

  create() {
    this.config = JUNGLE_LEVELS[this.levelId];
    this.branches = this.config.branches; this.levelHeight = this.config.height;
    this.dropThroughY = null; this.dropUntil = 0; this.lastDownAt = -1000; this.climbingVine = null; this.climbCooldown = 0;
    this.climbMantle = null;
    this.gameMode = GAME_MODES.JUMP;
    this.isPaused = false; this.isGameOver = false; this.levelCompleted = false;
    this.isDucking = false; this.facingX = 1; this.isSwinging = false;
    this.hammerSlamActive = false; this.wasGrounded = false;
    this.monkeys = []; this.boss = null; this.swingHits = new Set();
    this.invulnerableUntil = 0; this.helperNextAt = 0; this.helperRespawnAt = 0;
    this.worldTime = 0; this.lastGroundedAt = -1000;
    this.helperDrinkingPuddle = null; this.helperDrinkingSince = 0;
    const save = this.registry.get("saveData") || {};
    const normalized = normalizeInventory(save);
    this.inventory = normalized.inventory; this.equipped = normalized.equipped;
    this.maxHealth = 5; this.health = Math.max(1, Math.min(5, save.health || 5));
    this.coins = save.coins || 0; this.autoAimEnabled = Boolean(save.settings?.autoAim);
    this.add.image(480, 300, "jungle-background").setDisplaySize(960, 600).setDepth(-10).setScrollFactor(0);
    this.add.rectangle(480, 300, 960, 600, this.levelId === 'Lianenpfad' ? 0x0b4e3b : 0x123c2b, .16).setDepth(-9).setScrollFactor(0);
    this.add.image(110, this.levelHeight + 20, "jungle-tree").setOrigin(.5, 1).setDisplaySize(345, this.levelHeight + 100).setDepth(-5);
    this.add.image(850, this.levelHeight + 20, "jungle-tree").setOrigin(.5, 1).setDisplaySize(345, this.levelHeight + 100).setFlipX(true).setDepth(-5);
    this.physics.world.setBounds(0, -100, 960, this.levelHeight + 240);
    this.cameras.main.setBounds(0, 0, 960, this.levelHeight);
    this.createPlatforms(); this.createPlayer();
    this.hazards = new JungleHazards(this, this.branches);
    this.createMonkeys(); this.createUI(); this.createControls();
    this.shield = new ShieldManager(this, { standingOffsetY: -33, standingRadius: 38 });
    this.shield.initFromSave(applyInventoryToSave(save, this.inventory, this.equipped));
    this.shield.attach(this.player); this.shield.setHud(this.hud);
    this.helper = this.add.image(this.player.x - 36, this.config.spawn.y, "companion-running").setOrigin(.5, 1)
      .setDisplaySize(42, 42).setDepth(18);
    this.helper.setVisible(Boolean(this.equipped.companion));
    this.createVines();
    if (this.levelId === 'Lianenpfad') this.secretSwitch = new SecretSwitch(this, 'jungle');
    this.saveState();
    playMusic(this, "music-world");
    this.events.once("shutdown", () => {
      this.hazards?.destroy(); this.shield?.destroy(); this.inventoryOverlay?.destroy();
      this.monkeys.forEach(m => { this.cancelCharge(m); m.leaves?.destroy(); }); if (this.boss) this.cancelCharge(this.boss);
    });
  }

  createPlatforms() {
    if (!this.textures.exists("jungle-branch")) {
      const tex = this.textures.createCanvas("jungle-branch", 320, 24), ctx = tex.getContext();
      ctx.fillStyle = "#3e2a16"; ctx.fillRect(0, 5, 320, 17);
      ctx.fillStyle = "#936038"; ctx.fillRect(0, 6, 320, 9);
      ctx.fillStyle = "#b78650"; ctx.fillRect(0, 6, 320, 3);
      ctx.fillStyle = "#75a24b"; ctx.fillRect(0, 1, 320, 5);
      for (let x = 7; x < 320; x += 22) {
        ctx.fillStyle = "#afc75b"; ctx.fillRect(x, 0, 12, 3);
        ctx.fillStyle = "#584126"; ctx.fillRect(x + 4, 14, 14, 3);
      }
      tex.refresh();
    }
    this.platforms = this.physics.add.staticGroup();
    this.branches.forEach(s => {
      const branch = this.platforms.create(s.x + s.width / 2, s.y + 9, "jungle-branch")
        .setDisplaySize(s.width, 18).setDepth(3);
      branch.refreshBody();
      branch.body.checkCollision.down = false;
      branch.body.checkCollision.left = false; branch.body.checkCollision.right = false;
      branch.setData("surfaceY", s.y);
    });
  }

  createPlayer() {
    this.player = this.physics.add.image(this.config.spawn.x, this.config.spawn.y, "knight-standing").setOrigin(.5, 1).setDepth(20);
    this.player.setDisplaySize(90, 90);
    applyWeaponAppearance(this);
    this.player.body.setSize(50, 108, false).setOffset(49, 39);
    this.player.body.setGravityY(JUNGLE_PHYSICS.gravity);
    this.player.body.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.platforms, null,
      (player, branch) => !this.climbingVine && !(this.worldTime < this.dropUntil && Math.abs(branch.getData('surfaceY') - this.dropThroughY) < 3)
        && canLandOnBranch(player.body, branch.body.top), this);
    this.cameras.main.startFollow(this.player, true, .1, .12).setDeadzone(320, 130);
    this.cameras.main.setScroll(0, this.levelHeight - 600);
    this.swordHitbox = this.add.rectangle(-100, -100, 48, 38, 0xffeead, 0)
      .setDepth(19).setVisible(false);
  }

  createMonkeys() {
    this.config.monkeys.forEach((entry, index) => {
      const sprite = this.add.image(entry.x, entry.y, "monkey-" + entry.kind)
        .setOrigin(.5, 1).setDisplaySize(70, 70).setDepth(10);
      const monkey = { ...entry, homeX: entry.x, sprite, hp: MONKEY_TYPES[entry.kind].hp,
        nextThrowAt: 2000 + index * 900, nextClimbAt: 5000 + index * 1100,
        stunnedUntil: 0, chargeUntil: 0, active: true, climbing: false };
      if (monkey.hidden) {
        sprite.setAlpha(.7);
        monkey.leaves = this.add.image(monkey.x, monkey.y - 20, 'jungle-foliage').setDisplaySize(100, 64).setDepth(12).setAlpha(.93);
      }
      this.monkeys.push(monkey);
    });
    if (this.config.boss) {
      const position = this.config.bossPosition;
      const sprite = this.add.image(position.x, position.y, "monkey-king").setOrigin(.5, 1)
        .setDisplaySize(110, 100).setDepth(11);
      this.boss = { homeX: position.x, x: position.x, y: position.y, kind: "brown", sprite, hp: 18, maxHp: 18, isBoss: true,
        perches: position.perches, active: true, awake: false, nextThrowAt: 0,
        nextClimbAt: 7000, chargeUntil: 0, stunnedUntil: 0,
        throwCount: 0, vulnerableUntil: 0, hitsLeft: 0 };
    } else {
      const halo = this.add.circle(this.config.goal.x, this.config.goal.y, 27, 0xffd34b, .18)
        .setStrokeStyle(2, 0xffecaa, .9).setDepth(9);
      this.tweens.add({ targets: halo, scale: 1.15, alpha: .5, duration: 850, yoyo: true, repeat: -1 });
      this.goal = this.add.image(this.config.goal.x, this.config.goal.y, "coconut-brown").setDisplaySize(38, 38)
        .setTint(0xffe787).setDepth(10);
    }
  }

  createUI() {
    this.hud = new TopHud(this, {
      coins: this.coins, health: this.health, maxHealth: 5,
      consumables: this.inventory.consumables,
      activeEquipped: this.equipped.weapon, passiveEquipped: this.equipped.passive,
      passiveOwned: Boolean(this.equipped?.shield || this.equipped?.passive === "shield"), passiveShoes: Boolean(this.equipped?.shoes || this.equipped?.passive === "shoes"),
      consumableEquipped: this.equipped.consumable === "honey",
      showCompanion: true, companionHealth: this.equipped.companion ? 1 : 0,
    });
    applyItemModeSupport(this.hud, this.equipped, this.gameMode);
    this.add.text(18, 68, "URWALD / " + this.config.name.toUpperCase(), { ...textStyle, fontSize: "14px" }).setDepth(50);
    this.objective = this.add.text(18, 88, this.config.subtitle,
      { ...textStyle, fontSize: "12px" }).setDepth(50);
    this.stickyText = this.add.text(480, 527, "", { ...textStyle, fontSize: "18px",
      color: "#ffe494", backgroundColor: "#233e2b", padding: { x: 8, y: 4 } })
      .setOrigin(.5).setDepth(70).setVisible(false);
    this.add.text(480, 589, "{jump}: Springen · {climb}: Liane · {drop}: Durch Plattform · {shoot}: Bogen · ↑+{shoot}: hoch · {attack}: Nahkampf",
      { ...textStyle, fontSize: "12px" }).setOrigin(.5).setDepth(50);
    if (this.boss) {
      this.bossLabel = this.add.text(775, 81, "AFFENKÖNIG · Erreiche die Baumkrone",
        { ...textStyle, fontSize: "13px" }).setOrigin(.5).setDepth(55);
      this.add.rectangle(775, 102, 180, 8, 0x203523).setDepth(54);
      this.bossBar = this.add.rectangle(685, 102, 180, 6, 0xe9ad58).setOrigin(0, .5).setDepth(55);
    }
    this.hud.setScrollFactor(0);
    for (const child of this.children.list) if (child.depth >= 50) child.setScrollFactor(0);
    this.bossBar?.setScrollFactor(0);
    this.inventoryOverlay = new InventoryOverlay(this, {
      onEquip: (slot, id) => this.equip(slot, id), onClose: () => { if (this.isPaused) this.toggleInventory(); },
    });
  }

  createControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D");
    this.input.keyboard.on("keydown-SPACE", event => { if (this.hammerCharge) this.hammerCharge.press(event); else this.startSwing(); });
    this.input.keyboard.on("keydown-T", () => this.useHoney());
    this.input.keyboard.on("keydown", event => {
      if (event.code !== "Tab") return;
      event.preventDefault();
      this.toggleInventory();
    });
    this.input.keyboard.on("keydown-ESC", () => {
      if (this.inventoryOverlay.isOpen) { this.toggleInventory(); return; }
      showExitConfirmation(this, "JungleMapScene");
    });
  }

  saveState(extra = {}) {
    const save = this.registry.get("saveData") || {};
    const next = applyInventoryToSave({ ...save, health: this.health, coins: this.coins,
      currentWorld: "jungle", currentLevel: this.levelId, mapState: { ...save.mapState, jungleNode: this.levelId }, ...extra },
      this.inventory, this.equipped);
    this.registry.set("saveData", next); saveProgress(next);
  }

  equip(slot, id) {
    this.equipped[slot] = id;
    if (slot === "weapon") {
      this.isSwinging = false; this.hammerSlamActive = false; this.swordHitbox.setVisible(false);
      applyWeaponAppearance(this); this.hud.setActiveEquipped(id);
    }
    if (slot === "passive") {
      this.shield.initFromSave({ equipment: { shield: id === "shield" } }, { resetCooldown: false });
      this.hud.setPassiveEquipped(id); this.hud.setShoesOwned(id === "shoes");
    }
    if (slot === "companion") this.helper.setVisible(Boolean(id));
    if (slot === "consumable") this.hud.setConsumableEquipped(id === "honey");
    applyItemModeSupport(this.hud, this.equipped, this.gameMode); this.saveState();
  }

  toggleInventory() {
    if (this.isGameOver || this.levelCompleted) return;
    this.isPaused = !this.isPaused; this.inventoryOpen = this.isPaused;
    if (this.isPaused) {
      this.physics.world.pause(); this.inventoryOverlay.open(this.inventory, this.equipped);
    } else { this.inventoryOverlay.close(); this.physics.world.resume(); }
  }

  useHoney() {
    if (this.isPaused || this.isGameOver || this.levelCompleted || this.equipped.consumable !== "honey") return;
    const result = this.hud.tryUseHoney({ count: this.inventory.consumables.honey,
      health: this.health, maxHealth: 5, companionHealth: this.helperRespawnAt ? 0 : 1,
      companionRespawnAt: this.helperRespawnAt });
    if (!result.consumed) return;
    this.health = result.health; this.inventory.consumables.honey = result.count;
    this.helperRespawnAt = result.companionRespawnAt;
    if (!result.count) this.equipped.consumable = null;
    this.hud.setHealth(this.health, 5); this.hud.setConsumableCount(result.count);
    this.hud.setConsumableEquipped(this.equipped.consumable === "honey"); this.saveState();
  }

  takeJungleHit(damage) {
    if (this.isPaused || this.isGameOver || this.levelCompleted || this.worldTime < this.invulnerableUntil) return false;
    this.invulnerableUntil = this.worldTime + 1100;
    if (this.shield.tryBlockHit()) return false;
    this.health = Math.max(0, this.health - damage);
    this.events?.emit?.('player-hurt', { amount: damage, health: this.health });
    this.hud.setHealth(this.health, 5); this.cameras.main.shake(100, .004);
    this.saveState();
    if (!this.health) this.finish(false);
    return true;
  }

  playJungleSound(key) { if (this.cache.audio.exists(key)) this.sound.play(key, { volume: .35 }); }

  enemyBounds(enemy) {
    return new Phaser.Geom.Rectangle(enemy.x - (enemy.isBoss ? 31 : 22), enemy.y - (enemy.isBoss ? 79 : 56),
      enemy.isBoss ? 62 : 44, enemy.isBoss ? 76 : 54);
  }

  updateMonkeys(dt) {
    const now = this.worldTime;
    const enemies = [...this.monkeys, ...(this.boss ? [this.boss] : [])];
    enemies.forEach(m => {
      if (!m.active) return;
      if (m.hidden) {
        if (Math.hypot(m.x - this.player.x, m.y - this.player.body.bottom) < 190) this.revealMonkey(m);
        else return;
      }
      const view = this.cameras?.main?.worldView;
      if ((view && (m.y < view.y - 90 || m.y > view.bottom + 90)) || Math.abs(m.y - this.player.body.bottom) > 480) {
        this.cancelCharge(m); m.nextThrowAt = Math.max(m.nextThrowAt, now + 600); return;
      }
      if (m.isBoss && !m.awake) {
        if (this.player.body.bottom > Math.max(...m.perches) + 150) return;
        m.awake = true; m.nextThrowAt = now + 800; m.nextClimbAt = now + 6000;
      }
      if (now < m.stunnedUntil) return;
      m.sprite.setTint(m.climbing || m.chargeUntil ? MONKEY_TYPES[m.kind].color : 0xffffff);
      if (m.attackPhase === 'search') {
        // Looking around may follow the hero. Raising the coconut commits to one spot.
        m.sprite.setAngle?.(Math.sin((now - m.searchStartedAt) / 110) * 5);
        if (now >= m.searchUntil) this.prepareMonkeyThrow(m);
      } else if (m.chargeUntil) {
        m.throwPreview?.setPosition(m.x + m.throwDirection * 30, m.y - 58);
        if (now >= m.chargeUntil) {
          const from = { x: m.x + m.throwDirection * 28, y: m.y - 48 };
          const target = m.throwTarget;
          const direction = m.throwDirection;
          this.playJungleSound("sfx-monster-attack");
          this.hazards.throw(m.throwKind || m.kind, from, target, m);
          m.throwCount = (m.throwCount || 0) + 1;
          this.cancelCharge(m);
          m.nextThrowAt = now + (m.isBoss ? Math.max(1500, 2400 - (18 - m.hp) * 35) : MONKEY_TYPES[m.kind].interval);
          if (m.isBoss) { m.vulnerableUntil = now + 1300; m.hitsLeft = 2; m.helperHit = false; }
          m.attackPhase = 'release'; m.releaseUntil = now + 220; m.throwDirection = direction;
          this.setMonkeyPose(m, 'throwing'); m.sprite.setAngle?.(-direction * 12);
        }
      } else if (m.attackPhase === 'release') {
        if (now >= m.releaseUntil) { this.cancelCharge(m); this.setMonkeyPose(m, 'standing'); }
      } else if (m.climbing) {
        const phase = advanceMonkeyClimb(m, dt, m.isBoss ? 210 : 180, m.isBoss ? 105 : 62);
        m.sprite.setPosition(m.x, m.y);
        this.setMonkeyPose(m, phase === 'vertical' ? 'climbing' : 'standing');
        if (phase === 'done') { m.climbing = false; m.nextClimbAt = now + 6500; m.nextThrowAt = Math.max(m.nextThrowAt, now + 700); }
      } else if (now >= m.nextClimbAt) {
        const options = m.perches.filter(y => Math.abs(y - m.y) > 10)
          .sort((a,b) => Math.abs(a - this.player.body.bottom) - Math.abs(b - this.player.body.bottom));
        const route = options.map(y => planMonkeyClimb(this.config, m, y)).find(Boolean);
        if (!route) { m.nextClimbAt = now + 6500; return; }
        this.cancelCharge(m); m.targetY = route.targetY; m.climbRoute = route; m.climbing = true;
        this.setMonkeyPose(m, 'standing');
      } else if (now >= m.nextThrowAt && !this.confirmation?.isOpen) {
        m.attackPhase = 'search'; m.searchStartedAt = now; m.searchUntil = now + 550;
        this.setMonkeyPose(m, 'standing');
        m.warning = this.add.text(m.x, m.y - (m.isBoss ? 105 : 77), '?',
          { ...textStyle, color: '#fff2bd', fontSize: '20px' }).setOrigin(.5).setDepth(25);
      }
      const route = m.climbRoute;
      const horizontalTarget = route?.phase === 'approach' ? route.anchorX : route?.phase === 'depart' ? route.targetX : null;
      const lookX = m.attackPhase && m.attackPhase !== 'search' ? m.x + m.throwDirection : this.player.x;
      m.sprite.setFlipX(horizontalTarget === null ? lookX > m.x : horizontalTarget > m.x);
    });
    if (this.boss?.active) {
      this.bossBar.width = 180 * this.boss.hp / this.boss.maxHp;
      this.bossLabel.setText(!this.boss.awake ? "AFFENKÖNIG · Erreiche die Baumkrone"
        : now < this.boss.vulnerableUntil && this.boss.hitsLeft > 0 ? "AFFENKÖNIG · Jetzt angreifen!" : "AFFENKÖNIG · In Deckung!");
      this.boss.sprite.setTint(now < this.boss.vulnerableUntil && this.boss.hitsLeft > 0 ? 0xffffff : 0xaccd9c);
    }
  }

  setMonkeyPose(m, pose) {
    if (m.isBoss) return;
    m.sprite.setTexture(pose === "standing" ? "monkey-" + m.kind : "monkey-" + pose);
    m.sprite.setDisplaySize(70, 70);
    if (pose !== "standing") m.sprite.setTint(MONKEY_TYPES[m.kind].color);
  }
  prepareMonkeyThrow(m) {
    const target = this.player.body.center;
    m.throwTarget = { x: target.x, y: target.y };
    m.throwDirection = target.x < m.x ? -1 : 1;
    m.attackPhase = 'windup'; m.chargeUntil = this.worldTime + (m.isBoss ? 950 : 800);
    const attack = m.isBoss ? MONKEY_KING_THROWS[(m.throwCount || 0) % MONKEY_KING_THROWS.length] : null;
    m.throwKind = attack?.kind || m.kind;
    m.sprite.setAngle?.(0); this.setMonkeyPose(m, 'throwing');
    m.warning?.setText(attack?.warning || '!').setColor?.(attack?.color || '#ffe194');
    m.throwPreview = this.add.image(m.x + m.throwDirection * 30, m.y - 58,
      m.throwKind === 'stone' ? 'underground-stonemonster-rolledup' : 'coconut-' + m.throwKind)
      .setDisplaySize(m.isBoss ? 28 : 18, m.isBoss ? 28 : 18).setDepth(24);
    this.playJungleSound('sfx-charging');
  }
  cancelCharge(m) {
    m.warning?.destroy(); m.throwPreview?.destroy();
    m.warning = null; m.throwPreview = null; m.chargeUntil = 0;
    m.attackPhase = null; m.throwTarget = null; m.throwDirection = null;
    m.sprite?.setAngle?.(0);
  }

  damageMonkey(m, amount, helper = false) {
    if (!m.active) return false;
    if (m.hidden) this.revealMonkey(m);
    if (m.isBoss) {
      if (!m.awake || m.climbing || this.worldTime >= m.vulnerableUntil || (helper ? m.helperHit : m.hitsLeft <= 0)) return false;
      if (helper) m.helperHit = true; else m.hitsLeft -= 1;
    } else {
      this.cancelCharge(m); m.stunnedUntil = this.worldTime + 500;
      m.nextThrowAt = Math.max(m.nextThrowAt, this.worldTime + 900);
      this.setMonkeyPose(m, m.climbRoute?.phase === "vertical" ? "climbing" : "standing"); m.sprite.setTint(0xffb1af);
    }
    m.hp = Math.max(0, m.hp - amount); this.playJungleSound("sfx-monster-injured");
    if (!m.hp) {
      m.active = false; this.cancelCharge(m); m.sprite.destroy();
      if (m.isBoss) { this.finish(true); return true; }
      this.coins += 15; this.hud.setCoins(this.coins); this.playJungleSound('sfx-coin'); this.saveState();
    }
    return true;
  }

  startSwing(attack = null) {
    if (this.climbingVine || this.isPaused || this.isGameOver || this.levelCompleted || this.isSwinging || this.hammerSlamActive) return false;
    const stats = getAttackStats(this.equipped.weapon, attack); if (!stats) return false;
    this.hammerAttack = attack;
    if (this.autoAimEnabled) {
      const target = [...this.monkeys, ...(this.boss ? [this.boss] : [])]
        .filter(m => m.active && !m.hidden && Math.abs(m.x - this.player.x) <= stats.width + 30 && Math.abs(m.y - this.player.body.bottom) < 70)
        .sort((a, b) => Math.abs(a.x - this.player.x) - Math.abs(b.x - this.player.x))[0];
      if (target) this.facingX = target.x >= this.player.x ? 1 : -1;
    }
    this.isSwinging = true; this.swingHits = new Set();
    this.swingStartedAt = this.worldTime; this.swingVisualKind = 'swing';
    this.swingReadyAt = this.worldTime + stats.windupMs;
    this.swingUntil = this.worldTime + stats.swingMs;
    this.player.setFlipX(this.facingX > 0).setTexture(this.player.getData("hitTexture"));
    this.hud.flashItem("active"); this.playJungleSound("sfx-sword-slash");
    return true;
  }

  updateSwing() {
    if (!this.isSwinging || this.hammerSlamActive) return;
    if (this.worldTime >= this.swingUntil) {
      this.isSwinging = false; this.swordHitbox.setVisible(false);
      this.player.setTexture(this.player.getData("standingTexture")); return;
    }
    const stats = getWeaponStats(this.equipped.weapon);
    if (!stats) { this.isSwinging = false; this.swordHitbox.setVisible(false); return; }
    const hit = this.getMeleeBounds();
    this.swordHitbox.setPosition(hit.x + hit.width / 2, hit.y + hit.height / 2)
      .setSize(hit.width, hit.height).setVisible(false);
    if (this.worldTime < this.swingReadyAt) return;
    [...this.monkeys, ...(this.boss ? [this.boss] : [])].forEach(m => {
      if (!m.active || m.hidden || this.swingHits.has(m) || !Phaser.Geom.Intersects.RectangleToRectangle(hit, this.enemyBounds(m))) return;
      this.swingHits.add(m); this.damageMonkey(m, getMeleeDamage(this));
    });
    [...this.hazards.projectiles].forEach(p => {
      if (p.kind !== "stone" || this.swingHits.has(p) || !circleTouchesRect(p.x, p.y, p.radius, hit)) return;
      this.swingHits.add(p); this.hazards.damageStone(p, getMeleeDamage(this, true));
    });
  }

  getMeleeBounds() {
    const stats = getWeaponStats(this.equipped.weapon) || getWeaponStats('sword');
    return new Phaser.Geom.Rectangle(this.player.x + (this.facingX > 0 ? 0 : -stats.width),
      this.player.body.bottom - 55, stats.width, 40);
  }

  landSlam() {
    if (!this.hammerSlamActive) return;
    this.hammerSlamActive = false; this.isSwinging = false; this.startSwing();
    this.swingVisualKind = 'landing';
    this.swingReadyAt = Infinity;
    const x = this.player.x, y = this.player.body.bottom, radius = 95;
    [...this.monkeys, ...(this.boss ? [this.boss] : [])].forEach(m => {
      if (m.active && !m.hidden && circleTouchesRect(x, y, radius, this.enemyBounds(m))) this.damageMonkey(m, 1.5);
    });
    [...this.hazards.projectiles].forEach(p => {
      if (p.kind === "stone" && Math.hypot(p.x - x, p.y - y) <= radius) this.hazards.damageStone(p, 3);
    });
    const wave = this.add.ellipse(x, y, radius * 2, 22, 0xffe28b, .7).setDepth(22);
    this.tweens.add({ targets: wave, scaleX: 1.5, alpha: 0, duration: 350, onComplete: () => wave.destroy() });
    this.playJungleSound("sfx-stone-hit");
  }

  updateHelper(dt) {
    const now = this.worldTime;
    const enabled = Boolean(this.equipped.companion) && now >= this.helperRespawnAt;
    this.helper.setVisible(enabled);
    this.hud.setCompanionStatus({ health: enabled ? 1 : 0,
      respawnRatio: this.helperRespawnAt > now ? 1 - (this.helperRespawnAt - now) / 8000 : 0 });
    if (!enabled) { this.helperDrinkingPuddle = null; return; }
    const puddle = this.hazards.puddles.filter(p => Math.abs(p.x - this.player.x) < 230 && Math.abs(p.y - this.player.body.bottom) < 48)
      .sort((a,b) => Math.abs(a.x - this.helper.x) - Math.abs(b.x - this.helper.x))[0];
    const targetX = puddle ? puddle.x : this.player.x - this.facingX * 36;
    const targetY = puddle ? puddle.y : this.player.body.bottom;
    this.helper.x += Math.sign(targetX - this.helper.x) * Math.min(Math.abs(targetX - this.helper.x), 220 * dt);
    this.helper.y += (targetY - this.helper.y) * Math.min(1, dt * 9);
    this.helper.setFlipX(targetX < this.helper.x);
    if (canHelperDrink(this.helper, puddle)) {
      if (this.helperDrinkingPuddle !== puddle) this.helperDrinkingSince = now;
      this.helperDrinkingPuddle = puddle;
      this.helper.setTexture(companionDrinkTexture(now - this.helperDrinkingSince));
      // The new atlas faces right; its mouth should point into the puddle.
      this.helper.setFlipX(this.helper.x > puddle.x).setDisplaySize(42, 42);
      return;
    }
    if (this.helperDrinkingPuddle) this.helper.setTexture('companion-running').setDisplaySize(42, 42);
    this.helperDrinkingPuddle = null;
    if (now < this.helperNextAt) return;
    const target = [...this.monkeys, ...(this.boss ? [this.boss] : [])]
      .find(m => m.active && !m.hidden && Math.abs(m.x - this.helper.x) < 65 && Math.abs(m.y - this.helper.y) < 65);
    if (target && this.damageMonkey(target, 1, true)) {
      this.helperNextAt = now + 1200; this.helper.setTexture('companion-attacking');
    } else this.helper.setTexture('companion-running');
  }

  finish(won) {
    if (this.isGameOver || this.levelCompleted) return;
    this.levelCompleted = won; this.isGameOver = !won;
    this.physics.world.pause(); this.swordHitbox.setVisible(false);
    this.hazards.destroy();
    const save = this.registry.get("saveData") || {};
    const reward = won && !save.completedLevels?.includes(this.levelId) ? this.config.reward : 0;
    if (won) {
      const completed = new Set(save.completedLevels || []); completed.add(this.levelId);
      const unlocked = new Set(save.unlockedLevels || []);
      if (this.config.boss) { unlocked.add("UrwaldShop"); unlocked.add("Lianenpfad"); }
      this.coins += reward;
      this.hud.setCoins(this.coins);
      if (reward) this.playJungleSound('sfx-coin');
      const progress = { completedLevels: [...completed], unlockedLevels: [...unlocked] };
      if (this.levelId === 'Lianenpfad') {
        const clue = queueDragonClue(save, 'jungle');
        progress.pendingDragonClues = clue.pendingDragonClues || [];
        progress.unlockedWorlds = [...new Set([...(save.unlockedWorlds || []), 'water'])];
      }
      this.saveState(progress);
    } else { this.health = 5; this.saveState(); }
    const panel = this.add.container(0, 0).setDepth(300).setScrollFactor(0);
    panel.add(this.add.rectangle(480, 300, 960, 600, 0x102e23, .86));
    panel.add(this.add.rectangle(480, 300, 650, 340, 0x204d34, .98).setStrokeStyle(3, 0xd6bd67));
    panel.add(this.add.text(480, 205, won ? "URWALD-SIEG!" : "NOCH EIN VERSUCH!",
      { ...textStyle, fontSize: "40px", color: "#ffe19a" }).setOrigin(.5));
    panel.add(this.add.text(480, 285, won
      ? (this.config.boss ? "Der Affenkönig ist besiegt!\nUrwald-Shop und Lianenpfad freigeschaltet." : "Die goldene Kokosnuss gehört dir!") + (reward ? "\n+" + reward + " Gold" : "")
      : "Deine Herzen sind wieder voll.",
      { ...textStyle, fontSize: "23px", align: "center", lineSpacing: 10 }).setOrigin(.5));
    const button = this.add.text(480, 398, won ? "Zur Urwaldkarte · {confirm}" : "Neustart · {confirm}     Urwaldkarte · {back}",
      { ...textStyle, fontSize: "20px", backgroundColor: "#52704a", padding: { x: 16, y: 10 } })
      .setOrigin(.5).setInteractive({ useHandCursor: true });
    panel.add(button); panel.setScrollFactor(0); panel.list.forEach(child => child.setScrollFactor(0));
    const restartOrLeave = () => { if (won) this.scene.start("JungleMapScene"); else this.scene.restart({ levelId: this.levelId }); };
    button.on("pointerdown", restartOrLeave);
    this.input.keyboard.once("keydown-ENTER", restartOrLeave);
    this.input.keyboard.once("keydown-ESC", () => this.scene.start("JungleMapScene"));
    this.playJungleSound(won ? "sfx-success" : "sfx-gameover");
  }

  createVines() {
    (this.config.vines || []).forEach(vine => {
      const height = vine.bottom - vine.top;
      this.add.image(vine.x, vine.top + height / 2, 'jungle-vine').setDisplaySize(40, height).setDepth(4);
      this.add.image(vine.x, vine.top + 4, 'jungle-foliage').setDisplaySize(78, 35).setDepth(5);
    });
  }

  revealMonkey(monkey) {
    if (!monkey.hidden) return;
    monkey.hidden = false; monkey.sprite.setAlpha(1); monkey.leaves?.destroy(); monkey.leaves = null;
    monkey.nextThrowAt = this.worldTime + 1200;
    monkey.nextClimbAt = this.worldTime + 5000;
    this.playJungleSound('sfx-monster-injured');
  }

  tryDropThrough() {
    const now = this.worldTime, body = this.player.body;
    const quick = now - this.lastDownAt <= 300; this.lastDownAt = now;
    if (!quick || !(body.blocked.down || body.touching.down)) return false;
    const platform = this.branches.find(p => !p.ground && Math.abs(p.y - body.bottom) < 10 && body.right > p.x && body.x < p.x + p.width);
    if (!platform) return false;
    this.dropThroughY = platform.y; this.dropUntil = now + 450;
    this.lastGroundedAt = -1000;
    this.player.y += 7; body.position.y += 7; body.updateCenter();
    body.blocked.down = false; body.touching.down = false; body.setVelocityY(110);
    return true;
  }

  updateClimbing(direction, up, down, _jump, dt = .016) {
    const body = this.player.body, now = this.worldTime;
    if (this.climbMantle) { this.updateClimbMantle(dt); return true; }
    const grounded = body.blocked?.down || body.touching?.down;
    // Down on a branch means crouch/drop. Only grab downward in free air
    // after a deliberate drop has finished; Up can catch the vine at any time.
    const wantsToGrab = up || (down && !grounded && now >= (this.dropUntil || 0));
    const reachingUpWhileFalling = up && body.velocity?.y > 0;
    if (!this.climbingVine && (now >= this.climbCooldown || reachingUpWhileFalling) && wantsToGrab) {
      this.climbingVine = (this.config.vines || []).find(v => Math.abs(v.x - this.player.x) <= 15 &&
        body.bottom > v.top + 8 && body.y <= v.bottom) || null;
      if (this.climbingVine) {
        this.isSwinging = false; this.hammerSlamActive = false; this.swordHitbox?.setVisible(false);
        this.climbDistance = 0;
        this.lastGroundedAt = -1000;
        if (this.weaponSwitch) { this.weaponSwitch.pending = null; this.weaponSwitch.hand = 'melee'; this.weaponSwitch.shotUntil = 0; }
      }
    }
    const vine = this.climbingVine; if (!vine) return false;
    if (Math.abs(this.player.x - vine.x) > 15) {
      this.climbingVine = null; this.climbCooldown = now + 350; body.setAllowGravity(true);
      body.setVelocity(direction * 210, 0); this.restoreAfterClimbing(); return false;
    }
    const speed = ((down ? 1 : 0) - (up ? 1 : 0)) * 145 * (this.hazards.isSticky() ? .45 : 1);
    body.setAllowGravity(false); body.setVelocity(direction * 90, speed);
    this.climbDistance += Math.abs(speed) * dt;
    const female = this.registry?.get('saveData')?.playerGender === 'female';
    const texture = (female ? 'knight-female-climb-' : 'knight-climb-') + Math.floor(this.climbDistance / 24) % 2;
    if (this.textures?.exists(texture)) this.player.setTexture(texture);
    const platform = this.branches?.find(p => Math.abs(p.y - vine.top) < 16 && vine.x >= p.x && vine.x <= p.x + p.width);
    if (up && platform && body.bottom <= platform.y + 62) {
      this.climbMantle = { elapsed: 0, startX: this.player.x, startY: this.player.y,
        endX: Math.max(platform.x + 26, Math.min(platform.x + platform.width - 26, vine.x + (this.facingX || 1) * 20)),
        endY: this.player.y + platform.y - body.bottom - 1.5 };
      body.setVelocity(0, 0); this.updateClimbMantle(0); return true;
    }
    if (body.bottom < vine.top + 2 || body.y > vine.bottom || (down && body.bottom > vine.bottom + 6)) {
      this.climbingVine = null; this.climbCooldown = now + 300; body.setAllowGravity(true); body.setVelocityY(-45); this.restoreAfterClimbing();
    }
    return true;
  }

  updateClimbMantle(dt) {
    const mantle = this.climbMantle, body = this.player.body;
    mantle.elapsed += Math.max(0, Math.min(.05, dt));
    const t = Math.min(1, mantle.elapsed / .68), lift = t * t * (3 - 2 * t);
    const female = this.registry?.get('saveData')?.playerGender === 'female';
    const key = (female ? 'knight-female-mantle-' : 'knight-mantle-') + Math.min(3, Math.floor(t * 4));
    if (this.textures?.exists(key)) this.player.setTexture(key);
    this.player.setPosition(mantle.startX + (mantle.endX - mantle.startX) * lift,
      mantle.startY + (mantle.endY - mantle.startY) * lift);
    body.reset(this.player.x, this.player.y);
    // reset() starts at the image corner; immediately include our smaller,
    // offset hitbox so the last pose already rests on the platform this frame.
    body.updateFromGameObject();
    body.prev.copy(body.position); body.prevFrame.copy(body.position); body.autoFrame.copy(body.position);
    body.setAllowGravity(false); body.setVelocity(0, 0);
    if (t >= 1) {
      this.climbMantle = null; this.climbingVine = null; this.climbCooldown = this.worldTime + 400;
      body.setAllowGravity(true); this.lastGroundedAt = this.worldTime; this.restoreAfterClimbing();
    }
  }

  restoreAfterClimbing() { const key = this.player.getData?.('standingTexture'); if (key) this.player.setTexture(key); }

  activateHammerSlam() {
    const body = this.player.body;
    if (this.climbingVine || body.blocked.down || body.touching.down || this.isPaused || this.hammerSlamActive) return false;
    this.climbingVine = null; body.setAllowGravity(true);
    this.hammerCharge?.cancel();
    this.hammerSlamActive = true; this.isSwinging = true;
    this.swingStartedAt = this.worldTime; this.swingVisualKind = 'slam';
    body.setVelocityY(Math.max(550, body.velocity.y));
    this.player.setTexture(this.player.getData('hitTexture')); return true;
  }

  update(_time, delta) {
    if (this.isPaused || this.isGameOver || this.levelCompleted) return;
    const dt = Math.min(.05, delta / 1000); this.worldTime += dt * 1000;
    const body = this.player.body, grounded = body.blocked.down || body.touching.down;
    if (grounded) this.lastGroundedAt = this.worldTime;
    if (grounded && !this.wasGrounded) this.landSlam(); this.wasGrounded = grounded;
    const sticky = this.hazards.isSticky();
    this.stickyText.setVisible(sticky);
    if (sticky) this.stickyText.setText('KLEBRIG · ' + secondsLeft(this.hazards.slowUntil, this.worldTime) + 's · Springen gesperrt');
    const direction = (this.cursors.right.isDown || this.wasd.D.isDown ? 1 : 0) - (this.cursors.left.isDown || this.wasd.A.isDown ? 1 : 0);
    const jumpUp = Phaser.Input.Keyboard.JustDown(this.cursors.up), jumpW = Phaser.Input.Keyboard.JustDown(this.wasd.W);
    const downPress = Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.wasd.S);
    const downHeld = this.cursors.down.isDown || this.wasd.S.isDown, upHeld = this.cursors.up.isDown || this.wasd.W.isDown;
    const dropped = downPress && this.tryDropThrough();
    const climbing = this.updateClimbing(direction, upHeld, downHeld, jumpW && !sticky, dt);
    if (!climbing) {
      body.setVelocityX(this.hammerSlamActive ? 0 : direction * JUNGLE_PHYSICS.moveSpeed * (this.hammerCharge?.moveFactor ?? 1) * (sticky ? JUNGLE_PHYSICS.slowFactor : 1));
      if ((jumpUp || jumpW) && !sticky && !this.hammerSlamActive && this.worldTime - this.lastGroundedAt < 110) {
        body.setVelocityY(-JUNGLE_PHYSICS.jumpSpeed * (this.equipped.shoes || this.equipped.passive === 'shoes' ? 1.12 : 1));
        this.lastGroundedAt = -1000; this.playJungleSound('sfx-jump');
      }
      if (downPress && !grounded && !dropped && this.worldTime >= this.dropUntil && this.equipped.weapon === 'powerHammer') {
        if (this.weaponSwitch) this.weaponSwitch.request('melee', () => this.activateHammerSlam()); else this.activateHammerSlam();
      }
    }
    if (direction && !this.isSwinging && !this.climbMantle) { this.facingX = direction; this.player.setFlipX(direction > 0); }
    const ducking = downHeld && grounded && !climbing;
    if (ducking !== this.isDucking) {
      this.isDucking = ducking; body.setSize(50, ducking ? 70 : 108, false).setOffset(49, ducking ? 77 : 39);
      if (!this.isSwinging && !climbing) this.player.setTexture(this.player.getData(ducking ? 'crouchTexture' : 'standingTexture'));
    }
    this.updateMonkeys(dt); this.updateSwing(); this.updateHelper(dt); this.hazards.update(dt); this.shield.update();
    this.player.setAlpha(this.worldTime < this.invulnerableUntil && Math.floor(this.worldTime / 90) % 2 ? .45 : 1);
    if (body.y > this.levelHeight + 40) this.finish(false);
    if (!this.config.boss && Math.abs(this.player.x - this.config.goal.x) < 60 && body.bottom <= this.config.goal.y + 45) this.finish(true);
  }
}
