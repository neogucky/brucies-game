import { saveProgress } from "../../saveManager.js";
import { playMusic } from "../../soundManager.js";
import TopHud from "../../ui/topHud.js";
import InventoryOverlay from "../../ui/InventoryOverlay.js";
import ShieldManager from "../../utils/ShieldManager.js";
import { applyInventoryToSave, normalizeInventory } from "../../utils/inventory.js";
import { getWeaponStats, getWeaponDamage, applyWeaponAppearance } from "../../utils/weapons.js";
import { applyItemModeSupport, GAME_MODES } from "../../utils/itemRegistry.js";
import { JUNGLE_LEVELS, JUNGLE_BRANCHES, JUNGLE_PHYSICS, MONKEY_TYPES, MONKEY_KING_THROWS,
  canLandOnBranch, circleTouchesRect, secondsLeft } from "../../utils/jungleRules.js";
import JungleHazards from "../../utils/JungleHazards.js";

const textStyle = { fontFamily: "Trebuchet MS, sans-serif", color: "#fff4ce",
  stroke: "#173d2c", strokeThickness: 4 };

export default class JungleScene extends Phaser.Scene {
  constructor() { super({ key: "JungleScene" }); }
  init(data) { this.levelId = JUNGLE_LEVELS[data?.levelId] ? data.levelId : "Urwaldkronen"; }

  create() {
    this.config = JUNGLE_LEVELS[this.levelId];
    this.gameMode = GAME_MODES.JUMP;
    this.isPaused = false; this.isGameOver = false; this.levelCompleted = false;
    this.isDucking = false; this.facingX = 1; this.isSwinging = false;
    this.hammerSlamActive = false; this.wasGrounded = false;
    this.monkeys = []; this.boss = null; this.swingHits = new Set();
    this.invulnerableUntil = 0; this.helperNextAt = 0; this.helperRespawnAt = 0;
    this.worldTime = 0; this.lastGroundedAt = -1000;
    const save = this.registry.get("saveData") || {};
    const normalized = normalizeInventory(save);
    this.inventory = normalized.inventory; this.equipped = normalized.equipped;
    this.maxHealth = 5; this.health = Math.max(1, Math.min(5, save.health || 5));
    this.coins = save.coins || 0; this.autoAimEnabled = Boolean(save.settings?.autoAim);
    this.add.image(480, 300, "jungle-background").setDisplaySize(960, 600).setDepth(-10);
    this.add.rectangle(480, 300, 960, 600, 0x123c2b, .12).setDepth(-9);
    this.add.image(120, 585, "jungle-tree").setOrigin(.5, 1).setDisplaySize(355, 620).setDepth(-5);
    this.add.image(840, 585, "jungle-tree").setOrigin(.5, 1).setDisplaySize(355, 620).setFlipX(true).setDepth(-5);
    this.physics.world.setBounds(0, -100, 960, 740);
    this.cameras.main.setBounds(0, 0, 960, 600);
    this.createPlatforms(); this.createPlayer();
    this.hazards = new JungleHazards(this, JUNGLE_BRANCHES);
    this.createMonkeys(); this.createUI(); this.createControls();
    this.shield = new ShieldManager(this, { standingOffsetY: -33, standingRadius: 38 });
    this.shield.initFromSave({ equipment: { shield: this.equipped.passive === "shield" } });
    this.shield.attach(this.player); this.shield.setHud(this.hud);
    this.helper = this.add.image(90, 548, "companion-running").setOrigin(.5, 1)
      .setDisplaySize(42, 42).setDepth(18);
    this.helper.setVisible(Boolean(this.equipped.companion));
    this.saveState();
    playMusic(this, "music-world");
    this.events.once("shutdown", () => {
      this.hazards?.destroy(); this.shield?.destroy(); this.inventoryOverlay?.destroy();
      this.monkeys.forEach(m => this.cancelCharge(m)); if (this.boss) this.cancelCharge(this.boss);
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
    JUNGLE_BRANCHES.forEach(s => {
      const branch = this.platforms.create(s.x + s.width / 2, s.y + 9, "jungle-branch")
        .setDisplaySize(s.width, 18).setDepth(3);
      branch.refreshBody();
      branch.body.checkCollision.down = false;
      branch.body.checkCollision.left = false; branch.body.checkCollision.right = false;
      branch.setData("surfaceY", s.y);
    });
  }

  createPlayer() {
    this.player = this.physics.add.image(130, 562, "knight-standing").setOrigin(.5, 1).setDepth(20);
    this.player.setDisplaySize(90, 90);
    applyWeaponAppearance(this);
    this.player.body.setSize(50, 108, false).setOffset(49, 39);
    this.player.body.setGravityY(JUNGLE_PHYSICS.gravity);
    this.player.body.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.platforms, null,
      (player, branch) => canLandOnBranch(player.body, branch.body.top), this);
    this.swordHitbox = this.add.rectangle(-100, -100, 48, 38, 0xffeead, .25)
      .setDepth(19).setVisible(false);
  }

  createMonkeys() {
    this.config.monkeys.forEach((entry, index) => {
      const sprite = this.add.image(entry.x, entry.y, "monkey-" + entry.kind)
        .setOrigin(.5, 1).setDisplaySize(70, 70).setDepth(10);
      const monkey = { ...entry, sprite, hp: MONKEY_TYPES[entry.kind].hp,
        nextThrowAt: 2000 + index * 900, nextClimbAt: 5000 + index * 1100,
        stunnedUntil: 0, chargeUntil: 0, active: true, climbing: false };
      this.monkeys.push(monkey);
    });
    if (this.config.boss) {
      const sprite = this.add.image(725, 165, "monkey-king").setOrigin(.5, 1)
        .setDisplaySize(110, 100).setDepth(11);
      this.boss = { x: 725, y: 165, kind: "brown", sprite, hp: 18, maxHp: 18, isBoss: true,
        perches: [165, 320, 480], active: true, awake: false, nextThrowAt: 0,
        nextClimbAt: 7000, chargeUntil: 0, stunnedUntil: 0,
        throwCount: 0, vulnerableUntil: 0, hitsLeft: 0 };
    } else {
      this.goal = this.add.image(480, 62, "coconut-brown").setDisplaySize(38, 38)
        .setTint(0xffe787).setDepth(10);
    }
  }

  createUI() {
    this.hud = new TopHud(this, {
      coins: this.coins, health: this.health, maxHealth: 5,
      consumables: this.inventory.consumables,
      activeEquipped: this.equipped.weapon, passiveEquipped: this.equipped.passive,
      passiveOwned: this.equipped.passive === "shield", passiveShoes: this.equipped.passive === "shoes",
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
    this.add.text(480, 589, "A/D / Pfeile: Bewegen   W/↑: Springen   Leertaste: Angriff   S in der Luft: Hammer   Tab: Inventar   Esc: Karte",
      { ...textStyle, fontSize: "12px" }).setOrigin(.5).setDepth(50);
    if (this.boss) {
      this.bossLabel = this.add.text(480, 120, "AFFENKÖNIG · Erreiche die Baumkrone",
        { ...textStyle, fontSize: "13px" }).setOrigin(.5).setDepth(55);
      this.add.rectangle(480, 140, 180, 8, 0x203523).setDepth(54);
      this.bossBar = this.add.rectangle(390, 140, 180, 6, 0xe9ad58).setOrigin(0, .5).setDepth(55);
    }
    this.inventoryOverlay = new InventoryOverlay(this, {
      onEquip: (slot, id) => this.equip(slot, id), onClose: () => { if (this.isPaused) this.toggleInventory(); },
    });
  }

  createControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D");
    this.input.keyboard.on("keydown-SPACE", () => this.startSwing());
    this.input.keyboard.on("keydown-T", () => this.useHoney());
    this.input.keyboard.on("keydown", event => {
      if (event.code !== "Tab") return;
      event.preventDefault();
      this.toggleInventory();
    });
    this.input.keyboard.on("keydown-ESC", () => {
      if (this.inventoryOverlay.isOpen) { this.toggleInventory(); return; }
      if (this.isGameOver || this.levelCompleted) return;
      this.saveState(); this.scene.start("JungleMapScene");
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
    this.isPaused = !this.isPaused;
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
      if (m.isBoss && !m.awake) {
        if (this.player.body.bottom > 260 && this.monkeys.some(monkey => monkey.active)) return;
        m.awake = true; m.nextThrowAt = now + 800; m.nextClimbAt = now + 6000;
      }
      if (now < m.stunnedUntil) return;
      m.sprite.setTint(m.climbing || m.chargeUntil ? MONKEY_TYPES[m.kind].color : 0xffffff);
      if (m.chargeUntil) {
        m.throwPreview?.setPosition(m.x + (this.player.x < m.x ? -30 : 30), m.y - 58);
        if (now >= m.chargeUntil) {
          const from = { x: m.x + (this.player.x < m.x ? -28 : 28), y: m.y - 48 };
          const target = { x: this.player.body.center.x, y: this.player.body.center.y };
          this.playJungleSound("sfx-monster-attack");
          this.hazards.throw(m.throwKind || m.kind, from, target);
          m.throwCount = (m.throwCount || 0) + 1;
          this.cancelCharge(m);
          m.nextThrowAt = now + (m.isBoss ? Math.max(1500, 2400 - (18 - m.hp) * 35) : MONKEY_TYPES[m.kind].interval);
          if (m.isBoss) { m.vulnerableUntil = now + 1300; m.hitsLeft = 2; m.helperHit = false; }
          this.setMonkeyPose(m, "standing");
        }
      } else if (m.climbing) {
        const step = Math.sign(m.targetY - m.y) * Math.min(Math.abs(m.targetY - m.y), (m.isBoss ? 105 : 62) * dt);
        m.y += step;
        m.sprite.setPosition(m.x + Math.sin(now / 80) * 2, m.y);
        if (Math.abs(m.y - m.targetY) < 1) {
          m.y = m.targetY; m.climbing = false; m.nextClimbAt = now + 6500;
          this.setMonkeyPose(m, "standing");
        }
      } else if (now >= m.nextClimbAt) {
        const options = m.perches.filter(y => Math.abs(y - m.y) > 10);
        m.targetY = options.sort((a, b) => Math.abs(a - this.player.body.bottom) - Math.abs(b - this.player.body.bottom))[0];
        m.climbing = true; this.setMonkeyPose(m, "climbing");
      } else if (now >= m.nextThrowAt) {
        m.chargeUntil = now + (m.isBoss ? 850 : 700);
        this.playJungleSound("sfx-charging");
        const attack = m.isBoss ? MONKEY_KING_THROWS[(m.throwCount || 0) % MONKEY_KING_THROWS.length] : null;
        m.throwKind = attack?.kind || m.kind;
        if (m.isBoss) {
          m.throwPreview = this.add.image(m.x + (this.player.x < m.x ? -30 : 30), m.y - 58,
            m.throwKind === "stone" ? "underground-stonemonster-rolledup" : "coconut-" + m.throwKind)
            .setDisplaySize(28, 28).setDepth(24);
        }
        this.setMonkeyPose(m, "throwing");
        m.warning = this.add.text(m.x, m.y - (m.isBoss ? 105 : 77),
          attack?.warning || "!", { ...textStyle, color: attack?.color || "#ffe194", fontSize: "20px" })
          .setOrigin(.5).setDepth(25);
      }
      m.sprite.setFlipX(this.player.x > m.x);
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
  cancelCharge(m) {
    m.warning?.destroy(); m.throwPreview?.destroy();
    m.warning = null; m.throwPreview = null; m.chargeUntil = 0;
  }

  damageMonkey(m, amount, helper = false) {
    if (!m.active) return false;
    if (m.isBoss) {
      if (!m.awake || m.climbing || this.worldTime >= m.vulnerableUntil || (helper ? m.helperHit : m.hitsLeft <= 0)) return false;
      if (helper) m.helperHit = true; else m.hitsLeft -= 1;
    } else {
      this.cancelCharge(m); m.stunnedUntil = this.worldTime + 500;
      m.nextThrowAt = Math.max(m.nextThrowAt, this.worldTime + 900);
      this.setMonkeyPose(m, m.climbing ? "climbing" : "standing"); m.sprite.setTint(0xffb1af);
    }
    m.hp = Math.max(0, m.hp - amount); this.playJungleSound("sfx-monster-injured");
    if (!m.hp) {
      m.active = false; this.cancelCharge(m); m.sprite.destroy();
      if (m.isBoss) { this.finish(true); return true; }
      this.coins += 15; this.hud.setCoins(this.coins); this.saveState();
    }
    return true;
  }

  startSwing() {
    if (this.isPaused || this.isGameOver || this.levelCompleted || this.isSwinging || this.hammerSlamActive) return false;
    const stats = getWeaponStats(this.equipped.weapon); if (!stats) return false;
    if (this.autoAimEnabled) {
      const target = [...this.monkeys, ...(this.boss ? [this.boss] : [])]
        .filter(m => m.active && Math.abs(m.x - this.player.x) <= stats.width + 30 && Math.abs(m.y - this.player.body.bottom) < 70)
        .sort((a, b) => Math.abs(a.x - this.player.x) - Math.abs(b.x - this.player.x))[0];
      if (target) this.facingX = target.x >= this.player.x ? 1 : -1;
    }
    this.isSwinging = true; this.swingHits = new Set();
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
    const hit = new Phaser.Geom.Rectangle(this.player.x + (this.facingX > 0 ? 0 : -stats.width),
      this.player.body.bottom - 55, stats.width, 40);
    this.swordHitbox.setPosition(hit.x + hit.width / 2, hit.y + hit.height / 2)
      .setSize(hit.width, hit.height).setVisible(this.worldTime >= this.swingReadyAt);
    if (this.worldTime < this.swingReadyAt) return;
    [...this.monkeys, ...(this.boss ? [this.boss] : [])].forEach(m => {
      if (!m.active || this.swingHits.has(m) || !Phaser.Geom.Intersects.RectangleToRectangle(hit, this.enemyBounds(m))) return;
      this.swingHits.add(m); this.damageMonkey(m, getWeaponDamage(this.equipped.weapon));
    });
    [...this.hazards.projectiles].forEach(p => {
      if (p.kind !== "stone" || this.swingHits.has(p) || !circleTouchesRect(p.x, p.y, p.radius, hit)) return;
      this.swingHits.add(p); this.hazards.damageStone(p, getWeaponDamage(this.equipped.weapon, true));
    });
  }

  landSlam() {
    if (!this.hammerSlamActive) return;
    this.hammerSlamActive = false; this.isSwinging = false; this.startSwing();
    this.swingReadyAt = Infinity;
    const x = this.player.x, y = this.player.body.bottom, radius = 95;
    [...this.monkeys, ...(this.boss ? [this.boss] : [])].forEach(m => {
      if (m.active && circleTouchesRect(x, y, radius, this.enemyBounds(m))) this.damageMonkey(m, 1.5);
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
    if (!enabled) return;
    this.helper.x += (this.player.x - this.facingX * 36 - this.helper.x) * Math.min(1, dt * 7);
    this.helper.y += (this.player.body.bottom - this.helper.y) * Math.min(1, dt * 9);
    this.helper.setFlipX(this.facingX < 0);
    if (now < this.helperNextAt) return;
    const target = [...this.monkeys, ...(this.boss ? [this.boss] : [])]
      .find(m => m.active && Math.abs(m.x - this.helper.x) < 65 && Math.abs(m.y - this.helper.y) < 65);
    if (target && this.damageMonkey(target, 1, true)) {
      this.helperNextAt = now + 1200; this.helper.setTexture("companion-attacking");
    } else this.helper.setTexture("companion-running");
  }

  finish(won) {
    if (this.isGameOver || this.levelCompleted) return;
    this.levelCompleted = won; this.isGameOver = !won;
    this.physics.world.pause(); this.swordHitbox.setVisible(false);
    this.hazards.destroy();
    const save = this.registry.get("saveData") || {};
    if (won) {
      const completed = new Set(save.completedLevels || []); completed.add(this.levelId);
      const unlocked = new Set(save.unlockedLevels || []);
      if (this.config.boss) unlocked.add("Lianenpfad");
      this.coins += this.config.reward;
      this.hud.setCoins(this.coins);
      this.saveState({ completedLevels: [...completed], unlockedLevels: [...unlocked] });
    } else { this.health = 5; this.saveState(); }
    const panel = this.add.container(0, 0).setDepth(300);
    panel.add(this.add.rectangle(480, 300, 960, 600, 0x102e23, .86));
    panel.add(this.add.rectangle(480, 300, 650, 340, 0x204d34, .98).setStrokeStyle(3, 0xd6bd67));
    panel.add(this.add.text(480, 205, won ? "URWALD-SIEG!" : "NOCH EIN VERSUCH!",
      { ...textStyle, fontSize: "40px", color: "#ffe19a" }).setOrigin(.5));
    panel.add(this.add.text(480, 285, won
      ? (this.config.boss ? "Der Affenkönig ist besiegt!\nLianenpfad freigeschaltet." : "Die goldene Kokosnuss gehört dir!") + "\n+" + this.config.reward + " Gold"
      : "Deine Herzen sind wieder voll.",
      { ...textStyle, fontSize: "23px", align: "center", lineSpacing: 10 }).setOrigin(.5));
    const button = this.add.text(480, 398, won ? "Enter · Zur Urwaldkarte" : "Enter · Neustart     Esc · Urwaldkarte",
      { ...textStyle, fontSize: "20px", backgroundColor: "#52704a", padding: { x: 16, y: 10 } })
      .setOrigin(.5).setInteractive({ useHandCursor: true });
    panel.add(button);
    const restartOrLeave = () => { if (won) this.scene.start("JungleMapScene"); else this.scene.restart({ levelId: this.levelId }); };
    button.on("pointerdown", restartOrLeave);
    this.input.keyboard.once("keydown-ENTER", restartOrLeave);
    this.input.keyboard.once("keydown-ESC", () => this.scene.start("JungleMapScene"));
    this.playJungleSound(won ? "sfx-success" : "sfx-gameover");
  }

  update(_time, delta) {
    if (this.isPaused || this.isGameOver || this.levelCompleted) return;
    const dt = Math.min(.05, delta / 1000);
    this.worldTime += dt * 1000;
    // Gameplay clocks pause together with the inventory, including slow effects.
    const body = this.player.body, grounded = body.blocked.down || body.touching.down;
    if (grounded) this.lastGroundedAt = this.worldTime;
    if (grounded && !this.wasGrounded) this.landSlam();
    this.wasGrounded = grounded;
    const sticky = this.hazards.isSticky();
    this.stickyText.setVisible(sticky);
    if (sticky) this.stickyText.setText("KLEBRIG · " + secondsLeft(this.hazards.slowUntil, this.worldTime) + "s · Springen gesperrt");
    const direction = (this.cursors.right.isDown || this.wasd.D.isDown ? 1 : 0) -
      (this.cursors.left.isDown || this.wasd.A.isDown ? 1 : 0);
    body.setVelocityX(this.hammerSlamActive ? 0 : direction * JUNGLE_PHYSICS.moveSpeed * (sticky ? JUNGLE_PHYSICS.slowFactor : 1));
    if (direction && !this.isSwinging) { this.facingX = direction; this.player.setFlipX(direction > 0); }
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.W);
    if (jump && !sticky && !this.hammerSlamActive && this.worldTime - this.lastGroundedAt < 110) {
      body.setVelocityY(-JUNGLE_PHYSICS.jumpSpeed * (this.equipped.passive === "shoes" ? 1.12 : 1));
      this.lastGroundedAt = -1000; this.playJungleSound("sfx-jump");
    }
    const down = Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.wasd.S);
    if (down && !grounded && !this.hammerSlamActive && this.equipped.weapon === "powerHammer") {
      this.hammerSlamActive = true; this.isSwinging = true; body.setVelocityY(Math.max(550, body.velocity.y));
      this.player.setTexture(this.player.getData("hitTexture"));
    }
    this.updateMonkeys(dt); this.updateSwing(); this.updateHelper(dt); this.hazards.update(dt); this.shield.update();
    this.player.setAlpha(this.worldTime < this.invulnerableUntil && Math.floor(this.worldTime / 90) % 2 ? .45 : 1);
    if (body.y > 610) this.finish(false);
    if (!this.config.boss && !this.monkeys.some(m => m.active) &&
      Math.abs(this.player.x - 480) < 60 && body.bottom <= 100) this.finish(true);
  }
}
