import { defaultSave, loadSave, saveProgress } from "../saveManager.js";
import { registerIntroTextures } from "../utils/introAssets.js";
import { registerWorldMapAnimationTextures } from "../utils/worldMapAssets.js";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    this.load.image('knight-walk-atlas', 'assets/common/characters/world-travel/knight-walk.png');
    this.load.image('companion-drink-atlas', 'assets/common/characters/world-travel/helper-drink.png');
    this.load.image('intro-bedroom', 'assets/intro/bedroom.png');
    this.load.image('intro-exterior', 'assets/intro/exterior.png');
    this.load.image('intro-bed-atlas', 'assets/intro/bed.png');
    this.load.image('intro-bed-awake-source', 'assets/intro/bed-awake.png');
    this.load.image('intro-helper-atlas', 'assets/intro/helper.png');
    this.load.image('intro-dragon-atlas', 'assets/intro/dragon.png');
    this.load.image("worldmap-jungle-bg", "assets/jungle/jungle-worldmap.png");
    this.load.image("jungle-background", "assets/jungle/jungle-background.png");
    this.load.image("jungle-tree", "assets/jungle/jungle-tree.png");
    this.load.image("jungle-monkeys", "assets/jungle/jungle-monkeys.png");
    this.load.image("jungle-coconuts", "assets/jungle/jungle-coconuts.png");
    this.load.image("jungle-shop", "assets/jungle/jungle-shop-familiar.png");
    this.load.image("jungle-bow-atlas", "assets/jungle/jungle-bow-atlas.png");
    this.load.image("climbing-atlas", "assets/common/characters/climbing-atlas.png");
    this.load.image("professor-atlas", "assets/common/experts/professor-atlas.png");
    this.load.image("professor-study", "assets/common/experts/professor-study.png");
    this.load.image("bow-characters-atlas", "assets/common/characters/bow-characters-atlas.png");
    this.load.image("jungle-equipment-atlas", "assets/jungle/jungle-equipment-atlas.png");
    this.createLoadingUI();
    this.load.once("filecomplete-image-menu-bg", () => {
      if (this.menuBg) return;
      const bg = this.add.image(480, 300, "menu-bg");
      const scale = Math.max(960 / bg.width, 600 / bg.height);
      bg.setScale(scale);
      bg.setDepth(-2);
      this.menuBg = bg;
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
    this.load.image("power-hammer-atlas", "assets/common/characters/power-hammer-atlas.png");
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
    this.load.image("worldmap-underground-level", "assets/worldmap/underground_level.png");
    this.load.image("worldmap-underground-molelevel", "assets/worldmap/underground_molelevel.png");
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
    this.load.image(
      "underground-stonemonster-rolledup",
      "assets/underground/enemies/stonemonster_rolledup.png"
    );
    this.load.image(
      "underground-stonemonster-standing",
      "assets/underground/enemies/stonemonster_standing.png"
    );
    this.load.image(
      "underground-stonemonster-stunned",
      "assets/underground/enemies/stonemonster_stunned.png"
    );
    this.load.image("underground-coin", "assets/underground/coin_tile.png");
    this.load.image("cute-bat-atlas", "assets/underground/enemies/cute-bat-atlas.png");
    this.load.image("poison-berry", "assets/underground/enemies/poison-berry.png");
    this.load.image("underground-coin-used", "assets/underground/coin_tile_used.png");
    this.load.json("underground-dig-map", "assets/levels/underground_dig.json");
    this.load.json("underground-keytower-map", "assets/levels/underground_keytower.json");
    this.load.json("underground-crystal-map", "assets/levels/underground_crystal.json");
    this.load.image("tavern-bg", "assets/tavern/tavern.png");
    this.load.image("tavern-loading", "assets/tavern/tavern_loading.png");
    this.load.image("tavern-barkeeper", "assets/tavern/barkeeper.png");
    this.load.image("item-sword", "assets/common/items/sword.png");
    this.load.image("item-shield", "assets/common/items/shield.png");
    this.load.image("item-honey", "assets/common/items/honey-juice.png");
    this.load.image("item-companion", "assets/common/items/companion.png");
    this.load.image("item-winged-shoes", "assets/common/items/winged-shoes.png");
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
    this.load.audio("music-underground", "assets/common/sounds/music-underground.mp3");
    this.load.audio("music-world", "assets/common/sounds/music-world.mp3");
    this.load.audio("music-tavern", "assets/common/sounds/music-tavern.mp3");
  }

  create() {
    registerIntroTextures(this);
    this.createHammerTextures();
    this.createBatTextures();
    this.createJungleTextures();
    const saveData = loadSave();
    const unlockAll = new URLSearchParams(window.location.search).get("unlockAll") === "1";
    if (unlockAll) {
      saveData.unlockedLevels = Array.from(new Set([
        ...(saveData.unlockedLevels || []),
        "Wuestenruine", "Taverne", "DesertEndless", "Fremdweg",
        "UnderShop", "UnderDig", "Schluesseltor", "Schluesselweg", "Kristalltiefen",
        "UrwaldShop", "Urwaldkronen", "Lianenpfad",
      ]));
      saveData.unlockedWorlds = ["desert", "underground", "jungle"];
      saveData.currentWorld = new URLSearchParams(window.location.search).get("world") === "jungle" ? "jungle" : "underground";
      saveData.undergroundKeyCollected = true;
      saveData.health = 5;
      saveData.currentLevel = saveData.currentWorld === "jungle" ? saveData.mapState?.jungleNode || "UrwaldShop" : "Schluesselweg";
      saveData.mapState = { ...saveData.mapState, undergroundNode: "Schluesselweg" };
      saveProgress(saveData);
    }
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
    const junglePreview = unlockAll && new URLSearchParams(window.location.search).get("world") === "jungle";
    const returnScene = junglePreview ? "JungleMapScene" : unlockAll ? "UndergroundMapScene" : "MainMenuScene";
    if (new URLSearchParams(window.location.search).get('skipIntro') === '1') this.scene.start(returnScene);
    else this.scene.start('IntroScene', { returnScene });
  }

  createJungleTextures() {
    registerWorldMapAnimationTextures(this);
    const crop = (sourceKey, key, x, y, width, height, grounded = false, outWidth = 150, outHeight = 150) => {
      if (this.textures.exists(key)) return;
      const source = this.textures.get(sourceKey).getSourceImage();
      const cutout = document.createElement("canvas"); cutout.width = width; cutout.height = height;
      const ctx = cutout.getContext("2d"); ctx.drawImage(source, x, y, width, height, 0, 0, width, height);
      const pixels = ctx.getImageData(0, 0, width, height).data;
      let left = width, top = height, right = 0, bottom = 0;
      for (let cy = 0; cy < height; cy++) for (let cx = 0; cx < width; cx++) {
        if (pixels[(cy * width + cx) * 4 + 3] < 20) continue;
        left = Math.min(left, cx); right = Math.max(right, cx);
        top = Math.min(top, cy); bottom = Math.max(bottom, cy);
      }
      if (right < left || bottom < top) return;
      const w = right - left + 1, h = bottom - top + 1, scale = Math.min((outWidth - 10) / w, (outHeight - 6) / h);
      const texture = this.textures.createCanvas(key, outWidth, outHeight);
      texture.getContext().drawImage(cutout, left, top, w, h,
        (outWidth - w * scale) / 2, grounded ? outHeight - 3 - h * scale : (outHeight - h * scale) / 2, w * scale, h * scale);
      texture.refresh();
    };
    crop("jungle-monkeys", "monkey-brown", 0, 0, 500, 450, true);
    crop("jungle-monkeys", "monkey-red", 500, 0, 510, 450, true);
    crop("jungle-monkeys", "monkey-blue", 1010, 0, 526, 450, true);
    crop("jungle-monkeys", "monkey-climbing", 0, 460, 475, 550, true);
    crop("jungle-monkeys", "monkey-throwing", 475, 455, 450, 560, true);
    crop("jungle-monkeys", "monkey-king", 925, 445, 611, 575, true);
    crop("jungle-coconuts", "coconut-brown", 0, 0, 768, 540);
    crop("jungle-coconuts", "coconut-red", 768, 0, 768, 560);
    crop("jungle-coconuts", "coconut-blue", 0, 540, 690, 484);
    crop("jungle-coconuts", "coconut-puddle", 690, 650, 846, 374);
    const bowAtlas = this.textures.get("jungle-bow-atlas").getSourceImage();
    const half = Math.floor(bowAtlas.width / 2);
    crop("jungle-bow-atlas", "item-bow", 0, 0, half, bowAtlas.height);
    crop("jungle-bow-atlas", "bow-arrow", half, 0, bowAtlas.width - half, bowAtlas.height, false, 96, 24);
    const characters = this.textures.get("bow-characters-atlas").getSourceImage();
    ["knight-bow-", "knight-female-bow-"].forEach((prefix, row) => {
      ["standing", "hitting", "up", "crouching"].forEach((pose, column) => {
        const left = Math.round(column * characters.width / 4), top = Math.round(row * characters.height / 2);
        crop("bow-characters-atlas", prefix + pose, left, top,
          Math.round((column + 1) * characters.width / 4) - left,
          Math.round((row + 1) * characters.height / 2) - top, true);
      });
    });
    const climbing = this.textures.get("climbing-atlas").getSourceImage();
    ["knight-climb-", "knight-female-climb-"].forEach((prefix, row) => {
      for (let column = 0; column < 2; column++) {
        const x = Math.round(column * climbing.width / 2), y = Math.round(row * climbing.height / 2);
        crop("climbing-atlas", prefix + column, x, y, Math.round((column + 1) * climbing.width / 2) - x,
          Math.round((row + 1) * climbing.height / 2) - y, true);
      }
    });
    crop("professor-atlas", "professor-desert", 0, 0, 620, 619, true, 300, 340);
    crop("professor-atlas", "professor-underground", 630, 0, 624, 619, true, 300, 340);
    crop("professor-atlas", "professor-jungle", 0, 620, 620, 634, true, 300, 340);
    crop("professor-atlas", "professor-portrait", 630, 625, 624, 629, false, 200, 200);
    const equipment = this.textures.get("jungle-equipment-atlas").getSourceImage();
    const w = Math.floor(equipment.width / 2), h = Math.floor(equipment.height / 2);
    crop("jungle-equipment-atlas", "item-jungle-shield", 20, 0, 610, 550);
    crop("jungle-equipment-atlas", "jungle-foliage", w, 0, equipment.width - w, h, false, 180, 120);
    crop("jungle-equipment-atlas", "jungle-vine", 240, 550, 220, 595, false, 160, 512);
    crop("jungle-equipment-atlas", "item-belt", 645, 650, equipment.width - 645, 400);
    // The helmet slot uses the knight's own helmet, so it matches the portrait.
    const helmet = this.textures.createCanvas("item-helmet", 150, 150);
    helmet.getContext().drawImage(this.textures.get("knight-standing").getSourceImage(), 51, 18, 63, 45, 5, 25, 140, 100);
    helmet.refresh();
  }

  createBatTextures() {
    const atlas = this.textures.get("cute-bat-atlas").getSourceImage();
    const frames = [
      ["cave-bat-up", 50, 20, 745, 475, 470, 315],
      ["cave-bat-down", 840, 20, 680, 475, 1180, 315],
      ["cave-bat-glide", 20, 520, 800, 480, 430, 805],
      ["cave-bat-drop", 820, 520, 710, 480, 1190, 815],
    ];
    frames.forEach(([key, x, y, width, height, anchorX, anchorY]) => {
      if (this.textures.exists(key)) return;
      const texture = this.textures.createCanvas(key, 160, 112);
      texture.getContext().drawImage(atlas,
        x * atlas.width / 1536, y * atlas.height / 1024,
        width * atlas.width / 1536, height * atlas.height / 1024,
        80 - (anchorX - x) * .19, 56 - (anchorY - y) * .19,
        width * .19, height * .19);
      texture.refresh();
    });
    if (!this.anims.exists("cave-bat-flight")) this.anims.create({
      key: "cave-bat-flight", frames: [
        { key: "cave-bat-up" }, { key: "cave-bat-glide" },
        { key: "cave-bat-down" }, { key: "cave-bat-glide" },
      ], frameRate: 8, repeat: -1,
    });
  }

  createHammerTextures() {
    const atlas = this.textures.get("power-hammer-atlas").getSourceImage();
    const frames = [
      ["knight-hammer-standing", 0, 0, 420, 443],
      ["knight-hammer-hitting", 420, 0, 425, 443],
      ["knight-hammer-crouching", 845, 0, 435, 443],
      ["knight-hammer-crouching-hitting", 0, 443, 452, 414],
      ["knight-female-hammer-standing", 452, 443, 362, 414],
      ["knight-female-hammer-hitting", 814, 443, 466, 414],
      ["knight-female-hammer-crouching", 0, 857, 417, 423],
      ["knight-female-hammer-crouching-hitting", 417, 857, 474, 423],
      ["item-power-hammer", 891, 857, 389, 423],
    ];
    frames.forEach(([key, x, y, width, height]) => {
      if (this.textures.exists(key)) return;
      const texture = this.textures.createCanvas(key, 150, 150);
      const scale = Math.min(142 / width, 142 / height);
      const destWidth = width * scale;
      const destHeight = height * scale;
      texture.getContext().drawImage(atlas,
        x * atlas.width / 1280, y * atlas.height / 1280,
        width * atlas.width / 1280, height * atlas.height / 1280,
        (150 - destWidth) / 2, 146 - destHeight, destWidth, destHeight);
      texture.refresh();
    });
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
