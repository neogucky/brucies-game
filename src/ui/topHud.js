export default class TopHud {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = options;
    this.items = {};
    this.hearts = [];
    this.consumableCount = options.consumables?.honey ?? 0;
    this.create();
    this.setCoins(options.coins ?? 0);
    this.setHealth(options.health ?? options.maxHealth ?? 5, options.maxHealth ?? 5);
    this.setConsumableCount(this.consumableCount);
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
    this.coinIcon = this.scene.add.image(28, 30, "ui-coin").setOrigin(0.5);
    this.coinIcon.setScale(0.7);
    this.coinText = this.scene.add
      .text(50, 30, "Münzen: 0", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "18px",
        color: "#f7e3c0",
      })
      .setOrigin(0, 0.5)
      .setStroke("#433320", 3);

    this.createItems();
    this.createHearts();
  }

  createItems() {
    const frameWidth = 52;
    const frameHeight = 52;
    const spacing = 80;
    const startX = 360;
    const y = 36;

    const items = [
      { key: "active", label: "Schwert", hint: "Leertaste", icon: "item-sword" },
      { key: "passive", label: "Schild", hint: "Passiv", icon: "item-shield" },
      { key: "consumable", label: "Leer", hint: "T", icon: "item-honey" },
    ];

    items.forEach((item, index) => {
      const x = startX + index * spacing;
      const frame = this.scene.add.rectangle(x, y, frameWidth, frameHeight, 0xf2e3c5, 0.8);
      frame.setStrokeStyle(2, 0x8a6b44);
      const label = this.scene.add
        .text(x, y - 4, item.label, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "12px",
          color: "#4b3824",
        })
        .setOrigin(0.5);
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

      this.items[item.key] = { frame, label, hint, count, icon, overlay };
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
      frame.setStrokeStyle(2, 0x8a6b44);
      const icon = this.scene.add.image(companionX, y, "item-companion").setScale(0.26);
      const heart = this.scene.add.image(companionX, y + 40, "ui-heart").setScale(0.42);
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

  createHearts() {
    const maxHealth = this.options.maxHealth ?? 5;
    const spacing = 26;
    const startX = 930 - (maxHealth - 1) * spacing;
    for (let i = 0; i < maxHealth; i += 1) {
      const heart = this.scene.add.image(startX + i * spacing, 30, "ui-heart");
      heart.setScale(0.7);
      this.hearts.push(heart);
    }
  }

  setCoins(value) {
    this.coinText.setText(`Münzen: ${value}`);
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
    const label = count > 0 ? "Honigsaft" : "Leer";
    this.items.consumable.label.setText(label);
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
    if (key === "active") {
      item.label.setText("");
    }
    item.label.setColor(disabled ? "#8b8373" : "#4b3824");
    item.hint.setColor(disabled ? "#8b8373" : "#4b3824");
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
