export default class TopHud {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = options;
    this.items = {};
    this.hearts = [];
    this.consumableCount = options.consumables?.honey ?? 0;
    this.stones = options.stones ?? 0;
    this.keyCollected = Boolean(options.keyCollected);
    this.shoesOwned = Boolean(options.passiveShoes);
    this.bootsTextureKey = "item-boots";
    this.passiveOwned = Boolean(options.passiveOwned);
    this.create();
    this.setCoins(options.coins ?? 0);
    this.setStones(this.stones);
    this.setHealth(options.health ?? options.maxHealth ?? 5, options.maxHealth ?? 5);
    this.setConsumableCount(this.consumableCount);
    this.setKeyCollected(this.keyCollected);
    this.setPassiveOwned(Boolean(options.passiveOwned));
    this.setShoesOwned(this.shoesOwned);
    this.setShoesActive(false);
    if (options.showCompanion) {
      this.setCompanionStatus({
        health: options.companionHealth ?? 1,
        respawnRatio: options.companionRespawnRatio ?? 0,
      });
    }
    if (options.activeDisabled) {
      this.setItemDisabled("active", true);
    }
  }

  create() {
    this.coinIcon = this.scene.add.image(28, 20, "ui-coin").setOrigin(0.5);
    this.coinIcon.setScale(0.49);
    this.coinText = this.scene.add
      .text(45, 20, "0", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "18px",
        color: "#f7e3c0",
      })
      .setOrigin(0, 0.5)
      .setStroke("#433320", 3);

    this.keyIcon = this.scene.add.image(28, 44, "ui-key").setOrigin(0.5);
    this.keyIcon.setScale(0.38);
    this.keyIcon.setVisible(false);

    if (this.options.showStones) {
      this.stoneIcon = this.scene.add.image(28, 44, "ui-stone").setOrigin(0.5);
      this.stoneIcon.setScale(0.78);
      this.stoneText = this.scene.add
        .text(45, 44, "0", {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "16px",
          color: "#f7e3c0",
        })
        .setOrigin(0, 0.5)
        .setStroke("#433320", 3);
    }

    this.createItems();
    this.createHearts();
    this.setDepth(50);
  }

  setDepth(depth) {
    const items = [
      this.coinIcon,
      this.coinText,
      this.keyIcon,
      this.stoneIcon,
      this.stoneText,
      ...this.hearts,
    ];
    Object.values(this.items || {}).forEach((item) => {
      if (!item) return;
      items.push(
        item.frame,
        item.hint,
        item.count,
        item.icon,
        item.overlay,
        item.barBg,
        item.barFill,
        item.bootsIcon
      );
    });
    items.forEach((item) => {
      if (item && item.setDepth) {
        item.setDepth(depth);
      }
    });
  }

  setScrollFactor(factor) {
    const items = [
      this.coinIcon,
      this.coinText,
      this.keyIcon,
      this.stoneIcon,
      this.stoneText,
      ...this.hearts,
    ];
    Object.values(this.items || {}).forEach((item) => {
      if (!item) return;
      items.push(
        item.frame,
        item.hint,
        item.count,
        item.icon,
        item.overlay,
        item.barBg,
        item.barFill,
        item.bootsIcon
      );
    });
    items.forEach((item) => {
      if (item && item.setScrollFactor) {
        item.setScrollFactor(factor);
      }
    });
  }

  createItems() {
    this.ensureBootsTexture();
    const frameWidth = 52;
    const frameHeight = 52;
    const spacing = 80;
    const startX = 360;
    const y = 36;

    const items = [
      { key: "active", hint: "Leertaste", icon: "item-sword" },
      { key: "passive", hint: "Passiv", icon: "item-shield" },
      { key: "consumable", hint: "T", icon: "item-honey" },
    ];

    items.forEach((item, index) => {
      const x = startX + index * spacing;
      const frame = this.scene.add.rectangle(x, y, frameWidth, frameHeight, 0xf2e3c5, 0.8);
      frame.setStrokeStyle(3, 0xdbc1a0);
      const icon = this.scene.add.image(x, y, item.icon).setScale(0.266);
      const hint = this.scene.add
        .text(x, y + 36, item.hint, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "12px",
          color: "#4b3824",
        })
        .setOrigin(0.5);
      const count = this.scene.add
        .text(x + 18, y - 18, "", {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "12px",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      const overlay = this.scene.add.rectangle(x, y, frameWidth - 6, frameHeight - 6, 0x6f6f6f, 0.55);
      overlay.setVisible(false);
      let bootsIcon = null;
      if (item.key === "passive") {
        bootsIcon = this.scene.add.image(x + 16, y + 16, this.bootsTextureKey).setScale(0.22);
        bootsIcon.setVisible(false);
      }
      const barWidth = 46;
      const barHeight = 6;
      const barBg = this.scene.add
        .rectangle(x, y + 44, barWidth, barHeight, 0x3a2a1a, 0.7)
        .setVisible(false);
      const barFill = this.scene.add
        .rectangle(x - barWidth / 2, y + 44, 2, barHeight - 2, 0xf2e3c5, 0.9)
        .setOrigin(0, 0.5)
        .setVisible(false);

      this.items[item.key] = { frame, hint, count, icon, overlay, barBg, barFill, barWidth, bootsIcon };
    });

    if (this.options.showCompanion) {
      const companionX = startX + items.length * spacing;
      const frame = this.scene.add.rectangle(
        companionX,
        y,
        frameWidth,
        frameHeight,
        0xf2e3c5,
        0.8
      );
      frame.setStrokeStyle(3, 0xdbc1a0);
      const icon = this.scene.add.image(companionX, y, "item-companion").setScale(0.26);
      const heart = this.scene.add.image(companionX, y + 37, "ui-heart").setScale(0.42);
      const barWidth = 46;
      const barHeight = 6;
      const barBg = this.scene.add
        .rectangle(companionX, y + 40, barWidth, barHeight, 0x3a2a1a, 0.7)
        .setVisible(false);
      const barFill = this.scene.add
        .rectangle(companionX - barWidth / 2, y + 40, 2, barHeight - 2, 0xf2e3c5, 0.9)
        .setOrigin(0, 0.5)
        .setVisible(false);

      this.items.companion = { frame, icon, heart, barBg, barFill, barWidth };
    }
  }

  ensureBootsTexture() {
    if (this.scene.textures.exists("item-winged-shoes")) {
      this.bootsTextureKey = "item-winged-shoes";
      return;
    }
    if (this.scene.textures.exists("item-boots")) {
      this.bootsTextureKey = "item-boots";
      return;
    }
    const size = 40;
    const gfx = this.scene.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(0xf1e1c4, 1);
    gfx.fillRect(6, 10, 28, 20);
    gfx.fillStyle(0x8a6b44, 1);
    gfx.fillRect(6, 26, 28, 8);
    gfx.lineStyle(2, 0x6c5134, 1);
    gfx.strokeRect(6, 10, 28, 24);
    gfx.generateTexture("item-boots", size, size);
    this.bootsTextureKey = "item-boots";
    gfx.destroy();
  }

  createHearts() {
    const maxHealth = this.options.maxHealth ?? 5;
    const spacing = 26;
    const startX = 925 - (maxHealth - 1) * spacing;
    for (let i = 0; i < maxHealth; i += 1) {
      const heart = this.scene.add.image(startX + i * spacing, 20, "ui-heart");
      heart.setScale(0.63);
      this.hearts.push(heart);
    }
  }

  setCoins(value) {
    this.coinText.setText(`${value}`);
  }

  setKeyCollected(collected) {
    if (!this.keyIcon) return;
    this.keyCollected = Boolean(collected);
    this.keyIcon.setVisible(this.keyCollected);
  }

  setStones(value) {
    if (!this.stoneText) return;
    this.stoneText.setText(`${value}`);
  }

  setHealth(value, max = this.options.maxHealth ?? 5) {
    this.hearts.forEach((heart, index) => {
      const filled = index < value;
      heart.setTexture(filled ? "ui-heart" : "ui-heart-empty");
    });
    this.options.maxHealth = max;
  }

  setConsumableCount(count) {
    this.consumableCount = count;
    this.items.consumable.count.setText(count > 0 ? `x${count}` : "");
    this.items.consumable.icon.setAlpha(count > 0 ? 1 : 0.25);
    this.items.consumable.hint.setColor(count > 0 ? "#4b3824" : "#8b8373");
  }

  setItemDisabled(key, disabled) {
    const item = this.items[key];
    if (!item) return;
    item.overlay.setVisible(false);
    const alpha = disabled ? 0.25 : 1;
    item.icon.setAlpha(alpha);
    item.hint.setColor(disabled ? "#8b8373" : "#4b3824");
  }

  setPassiveOwned(owned) {
    const item = this.items.passive;
    if (!item) return;
    this.passiveOwned = Boolean(owned);
    const alpha = owned ? 1 : 0.25;
    item.icon.setAlpha(alpha);
    if (owned) {
      item.icon.setTexture("item-shield");
    } else if (this.shoesOwned) {
      item.icon.setTexture(this.bootsTextureKey);
      item.icon.setAlpha(1);
    }
    item.hint.setColor(owned ? "#4b3824" : "#8b8373");
  }

  setShoesOwned(owned) {
    const item = this.items.passive;
    if (!item || !item.bootsIcon) return;
    this.shoesOwned = Boolean(owned);
    if (!this.passiveOwned && this.shoesOwned) {
      item.icon.setTexture(this.bootsTextureKey);
      item.icon.setAlpha(1);
      item.hint.setColor("#4b3824");
      item.bootsIcon.setVisible(false);
      return;
    }
    item.bootsIcon.setVisible(Boolean(owned));
  }

  setShoesActive(active) {
    const item = this.items.passive;
    if (!item) return;
    const target = this.passiveOwned ? item.bootsIcon : item.icon;
    if (!target) return;
    if (active) {
      if (this.shoesBlinkTween) return;
      this.shoesBlinkTween = this.scene.tweens.add({
        targets: target,
        alpha: { from: 1, to: 0.35 },
        duration: 180,
        yoyo: true,
        repeat: -1,
      });
    } else if (this.shoesBlinkTween) {
      this.shoesBlinkTween.stop();
      this.shoesBlinkTween = null;
      target.setAlpha(1);
    }
  }

  flashItem(key) {
    const item = this.items[key];
    if (!item || !item.icon) return;
    if (item.flashTween) {
      item.flashTween.stop();
      item.flashTween = null;
      item.icon.setAlpha(1);
    }
    item.flashTween = this.scene.tweens.add({
      targets: item.icon,
      alpha: { from: 1, to: 0.35 },
      duration: 45,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        item.icon.setAlpha(1);
        item.flashTween = null;
      },
    });
  }

  setPassiveCooldown({ owned, active, ratio }) {
    const item = this.items.passive;
    if (!item) return;
    if (!owned) {
      item.barBg.setVisible(false);
      item.barFill.setVisible(false);
      return;
    }
    const showBar = !active;
    item.barBg.setVisible(showBar);
    item.barFill.setVisible(showBar);
    if (showBar) {
      const width = (item.barWidth - 4) * ratio;
      item.barFill.displayWidth = Math.max(2, width);
    }
  }

  setCompanionStatus({ health, respawnRatio }) {
    const companion = this.items.companion;
    if (!companion) return;
    const hasHealth = health > 0;
    companion.heart.setVisible(hasHealth);
    companion.heart.setTexture(hasHealth ? "ui-heart" : "ui-heart-empty");
    companion.barBg.setVisible(!hasHealth);
    companion.barFill.setVisible(!hasHealth);
    if (!hasHealth) {
      const width = (companion.barWidth - 4) * respawnRatio;
      companion.barFill.displayWidth = Math.max(2, width);
    }
  }

  tryUseHoney({ count, health, maxHealth, companionHealth, companionRespawnAt }) {
    const companionNeedsHeal = companionHealth <= 0 && companionRespawnAt > 0;
    if (count <= 0) {
      return { consumed: false, count, health, companionHealth, companionRespawnAt };
    }
    if (health >= maxHealth && !companionNeedsHeal) {
      return { consumed: false, count, health, companionHealth, companionRespawnAt };
    }
    const nextCount = count - 1;
    const nextHealth = Math.min(maxHealth, health + 1);
    const nextCompanionHealth = companionNeedsHeal ? 1 : companionHealth;
    const nextCompanionRespawnAt = companionNeedsHeal ? 0 : companionRespawnAt;
    this.setConsumableCount(nextCount);
    this.setHealth(nextHealth, maxHealth);
    this.scene.events.emit("consumable-used", { type: "honey" });
    return {
      consumed: true,
      count: nextCount,
      health: nextHealth,
      companionHealth: nextCompanionHealth,
      companionRespawnAt: nextCompanionRespawnAt,
    };
  }
}
