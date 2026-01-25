import { defaultSave, loadSave, saveProgress } from "../saveManager.js";
import { playMusic } from "../soundManager.js";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    this.createLoadingUI();
    this.load.once("filecomplete-image-menu-bg", () => {
      if (this.menuBg) return;
      const bg = this.add.image(480, 300, "menu-bg");
      const scale = Math.max(960 / bg.width, 600 / bg.height);
      bg.setScale(scale);
      bg.setDepth(-2);
      this.menuBg = bg;
    });
    this.load.once("filecomplete-audio-music-menu", () => {
      playMusic(this, "music-menu");
    });
    this.load.image("desert-start", "assets/desert/desert_start.png");
    this.load.image("desert-end", "assets/desert/desert_end.png");
    this.load.image("desert-lost", "assets/desert/desert_lost.png");
    this.load.image("menu-bg", "assets/common/menu/menu.png");
    this.load.image("ui-coin", "assets/common/ui/coin.png");
    this.load.image("ui-stone", "assets/common/ui/stone.svg");
    this.load.image("ui-heart", "assets/common/ui/heart.png");
    this.load.image("ui-heart-empty", "assets/common/ui/heart_empty.png");
    this.load.image("knight-standing", "assets/common/characters/knight_standing.png");
    this.load.image("knight-hitting", "assets/common/characters/knight_hitting.png");
    this.load.image("knight-crouching", "assets/common/characters/knight_crouching.png");
    this.load.image("knight-crouching-hitting", "assets/common/characters/knight_crouching_hitting.png");
    this.load.image("knight-female-standing", "assets/common/characters/knight_female_standing.png");
    this.load.image("knight-female-hitting", "assets/common/characters/knight_female_hitting.png");
    this.load.image("knight-female-crouching", "assets/common/characters/knight_female_crouching.png");
    this.load.image(
      "knight-female-crouching-hitting",
      "assets/common/characters/knight_female_crouching_hitting.png"
    );
    this.load.image("desert-ruin", "assets/desert/ruin.png");
    this.load.image("desert-ruin-repaired", "assets/desert/ruin_repaired.png");
    this.load.image("desert-stone-rolling", "assets/desert/stone_rolling.png");
    this.load.image("desert-stone-1", "assets/desert/stone_1.png");
    this.load.image("desert-stone-2", "assets/desert/stone_2.png");
    this.load.image("desert-stone-3", "assets/desert/stone_3.png");
    this.load.image("worldmap-ruin", "assets/worldmap/ruin.png");
    this.load.image("worldmap-ruin-repaired", "assets/worldmap/ruin_repaired.png");
    this.load.image("desert-bg", "assets/desert/desert.png");
    this.load.image("desert-quarry-bg", "assets/desert/desert_quarry.png");
    this.load.image("worldmap-bg", "assets/worldmap/desert_world.png");
    this.load.image("worldmap-oasis", "assets/worldmap/oasis.png");
    this.load.image("worldmap-quarry", "assets/worldmap/quarry.png");
    this.load.image("worldmap-quarry-tunnel", "assets/worldmap/quarry_tunnel.png");
    this.load.image("worldmap-underground-bg", "assets/worldmap/underground_world.png");
    this.load.image("worldmap-keytower", "assets/worldmap/keytower.png");
    this.load.image("worldmap-keytower-open", "assets/worldmap/keytower_open.png");
    this.load.image("tavern-map", "assets/worldmap/tavern.png");
    this.load.image("underground-shop-map", "assets/worldmap/underground_shop.png");
    this.load.image("underground-shop", "assets/underground/underground_shop.png");
    this.load.image("underground-shop-loading", "assets/underground/underground_shop_loading.png");
    this.load.image("underground-bg", "assets/underground/underground.png");
    this.load.image("underground-bg-alt", "assets/underground/underground_alt.png");
    this.load.image("underground-gate", "assets/underground/gate.png");
    this.load.image("underground-earth", "assets/underground/earth_tile.png");
    this.load.image("underground-stone", "assets/underground/stone_tile.png");
    this.load.image("underground-onyx", "assets/underground/onyx_tile.png");
    this.load.json("underground-dig-map", "assets/levels/underground_dig.json");
    this.load.json("underground-keytower-map", "assets/levels/underground_keytower.json");
    this.load.image("tavern-bg", "assets/tavern/tavern.png");
    this.load.image("tavern-loading", "assets/tavern/tavern_loading.png");
    this.load.image("tavern-barkeeper", "assets/tavern/barkeeper.png");
    this.load.image("item-sword", "assets/common/items/sword.png");
    this.load.image("item-shield", "assets/common/items/shield.png");
    this.load.image("item-honey", "assets/common/items/honey-juice.png");
    this.load.image("item-companion", "assets/common/items/companion.png");
    this.load.image("ui-key", "assets/common/items/key.png");
    this.load.image("companion-running", "assets/common/characters/companien_running.png");
    this.load.image("companion-searching", "assets/common/characters/companion_searching.png");
    this.load.image("companion-detected", "assets/common/characters/companion_detected.png");
    this.load.image("companion-attacking", "assets/common/characters/companion_attacking.png");
    this.load.image("desert-mole-digging", "assets/desert/enemies/desertmole_digging.png");
    this.load.image("desert-mole-running", "assets/desert/enemies/desertmole_running.png");
    this.load.image("desert-mole-attacking", "assets/desert/enemies/desertmole_attacking.png");
    this.load.image("desert-mole-charging", "assets/desert/enemies/desertmole_charging.png");
    this.load.image("desert-mole-stunned", "assets/desert/enemies/desertmole_stunned.png");
    this.load.image("desert-stone-pile", "assets/desert/stone_pile.svg");
    this.load.image("chest-closed", "assets/desert/chest_closed.png");
    this.load.image("chest-open", "assets/desert/chest_open.png");
    this.load.image("chest-opened", "assets/desert/chest_open.png");
    this.load.audio("sfx-chest-hit", "assets/common/sounds/chest_hit.wav");
    this.load.audio("sfx-coin", "assets/common/sounds/coin.wav");
    this.load.audio("sfx-companion-hit", "assets/common/sounds/companion_hit.wav");
    this.load.audio("sfx-monster-attack", "assets/common/sounds/monster_atttack.wav");
    this.load.audio("sfx-monster-dig", "assets/common/sounds/monster_dig.wav");
    this.load.audio("sfx-monster-injured", "assets/common/sounds/monster_injured.wav");
    this.load.audio("sfx-monster-miss", "assets/common/sounds/monster_miss.wav");
    this.load.audio("sfx-sword-slash", "assets/common/sounds/sword_slash.wav");
    this.load.audio("sfx-success", "assets/common/sounds/success.wav");
    this.load.audio("sfx-companion-fear", "assets/common/sounds/companion_fear.mp3");
    this.load.audio("sfx-gameover", "assets/common/sounds/gameover.wav");
    this.load.audio("sfx-eating", "assets/common/sounds/eating.wav");
    this.load.audio("sfx-charging", "assets/common/sounds/charging.wav");
    this.load.audio("sfx-power-attack", "assets/common/sounds/power-attack.wav");
    this.load.audio("sfx-explosion", "assets/common/sounds/explosion.wav");
    this.load.audio("sfx-monster-death", "assets/common/sounds/monster_death.wav");
    this.load.audio("sfx-stone-rolling", "assets/common/sounds/stone_rolling.wav");
    this.load.audio("sfx-stone-hit", "assets/common/sounds/stone_hitting.wav");
    this.load.audio("sfx-shield-impact", "assets/common/sounds/shield_impact.wav");
    this.load.audio("sfx-stone-collected", "assets/common/sounds/stone_collected.wav");
    this.load.audio("sfx-digging-earth", "assets/common/sounds/digging_earth.wav");
    this.load.audio("sfx-digging-failed", "assets/common/sounds/digging_failed.wav");
    this.load.audio("sfx-jump", "assets/common/sounds/jump.wav");
    this.load.audio("sfx-levitating", "assets/common/sounds/levitating.wav");
    this.load.audio("sfx-key-open", "assets/common/sounds/key_open.wav");
    this.load.audio("sfx-digging-earth", "assets/common/sounds/digging_earth.wav");
    this.load.audio("sfx-digging-failed", "assets/common/sounds/digging_failed.wav");
    this.load.audio("sfx-jump", "assets/common/sounds/jump.wav");
    this.load.audio("music-desert", "assets/common/sounds/music-desert.mp3");
    this.load.audio("music-menu", "assets/common/sounds/music-menu.mp3");
    this.load.audio("music-world", "assets/common/sounds/music-world.mp3");
    this.load.audio("music-tavern", "assets/common/sounds/music-tavern.mp3");
  }

  create() {
    const saveData = loadSave();
    this.registry.set("saveData", { ...defaultSave, ...saveData });
    this.installDisplaySizeGuard();
    this.installPhaserErrorGuards();
    this.scale.on("fullscreenchange", (_, isFullscreen) => {
      document.body.classList.toggle("fullscreen", isFullscreen);
      this.scale.refresh();
      const current = this.registry.get("saveData") || {};
      const nextSave = {
        ...current,
        settings: {
          ...(current.settings || {}),
        },
      };
      this.registry.set("saveData", nextSave);
      saveProgress(nextSave);
    });
    this.scene.start("MainMenuScene");
  }

  installDisplaySizeGuard() {
    const patch = (proto, name) => {
      if (!proto || proto._safeSetDisplaySize) return;
      const original = proto.setDisplaySize;
      proto._safeSetDisplaySize = true;
      proto.setDisplaySize = function setDisplaySizeSafe(width, height) {
        const texture = this.texture;
        const source = texture?.getSourceImage?.();
        if (!source) {
          const key = texture?.key ?? "unknown";
          const sceneKey = this.scene?.scene?.key ?? "unknown";
          console.warn(
            `[setDisplaySize guard] Missing texture source for ${name} (key=${key}) in ${sceneKey}`
          );
          return this;
        }
        return original.call(this, width, height);
      };
    };
    patch(Phaser.GameObjects.Image.prototype, "Image");
    patch(Phaser.GameObjects.Sprite.prototype, "Sprite");
  }

  installPhaserErrorGuards() {
    if (this._phaserErrorGuardsInstalled) return;
    this._phaserErrorGuardsInstalled = true;
    if (typeof window !== "undefined") {
      window.addEventListener("error", (event) => {
        const message = event?.error?.message || event?.message;
        if (message && message.includes("reading 'cut'")) {
          console.warn("[Phaser error] cut access failure", {
            message,
            stack: event?.error?.stack,
          });
        }
      });
    }
    const frameProto = Phaser?.Textures?.Frame?.prototype;
    if (!frameProto || frameProto._safeSetSize) return;
    const original = frameProto.setSize;
    frameProto._safeSetSize = true;
    frameProto.setSize = function setSizeSafe(width, height, x = 0, y = 0) {
      try {
        if (!this.data) {
          console.warn("[Frame.setSize guard] Missing frame data", {
            textureKey: this.texture?.key,
            name: this.name,
            width,
            height,
          });
          return this;
        }
        return original.call(this, width, height, x, y);
      } catch (error) {
        console.warn("[Frame.setSize error]", {
          message: error?.message,
          textureKey: this.texture?.key,
          name: this.name,
          width,
          height,
        });
        throw error;
      }
    };
  }

  createLoadingUI() {
    const barWidth = 360;
    const barHeight = 16;
    const bg = this.add.rectangle(480, 300, barWidth, barHeight, 0x1e150c, 0.7);
    bg.setStrokeStyle(2, 0x8a6b44);
    const fill = this.add.rectangle(480 - barWidth / 2, 300, 2, barHeight - 4, 0xf7edd6, 0.9);
    fill.setOrigin(0, 0.5);
    const label = this.add
      .text(480, 270, "Lade Spiel...", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#f7edd6",
      })
      .setOrigin(0.5)
      .setStroke("#433320", 2);

    this.load.on("progress", (value) => {
      fill.displayWidth = Math.max(2, (barWidth - 4) * value);
    });

    this.load.once("complete", () => {
      bg.destroy();
      fill.destroy();
      label.destroy();
    });
  }
}
