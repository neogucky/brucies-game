import { saveProgress } from "../../saveManager.js";
import { playMusic } from "../../soundManager.js";
import TopHud from "../../ui/topHud.js";
import CoordinateDebugger from "../../utils/coordinateDebugger.js";
import DesertMoleAI from "../../utils/DesertMoleAI.js";

export default class UndergroundDigScene extends Phaser.Scene {
  constructor() {
    super({ key: "UndergroundDigScene" });
    this.blockMap = new Map();
    this.isPaused = false;
    this.isEditorMode = false;
    this.mapKey = "underground-dig-map";
    this.levelId = "UnderDig";
    this.locationName = "Untergrundpfad";
    this.scrollXEnabled = false;
    this.worldWidth = 960;
    this.worldHeight = 600;
    this.disableGate = false;
    this.disableKey = false;
    this.disableChests = false;
    this.editorPlacement = "earth";
    this.editorMenu = null;
    this.coinsGroup = null;
    this.heartsGroup = null;
    this.molesGroup = null;
    this.moleStates = new Map();
    this.moleStepDelay = 180;
    this.moleAIs = new Map();
    this.moleBarHeight = 5;
    this.debugHitboxes = false;
    this.showDashDebug = false;
    this.dashDebugGraphics = null;
    this.hasShoes = false;
    this.dashActive = false;
    this.dashDir = 0;
    this.dashLocked = false;
    this.dashLastTap = { left: 0, right: 0 };
    this.dashTapWindow = 300;
    this.dashSpeedMultiplier = 2;
    this.dashBounceDistance = 0;
    this.maxHealth = 5;
    this.health = this.maxHealth;
    this.coinsCollected = 0;
    this.facingX = 1;
    this.startCol = null;
    this.startRow = null;
    this.isSwinging = false;
    this.swingTimer = null;
    this.isDucking = false;
    this.standScale = 0.6;
    this.duckScale = 0.6;
    this.standBodyHeight = 1;
    this.duckBodyHeight = 0.5;
    this.isHitboxEditMode = false;
    this.hitboxEditor = null;
    this.gateOffsetX = 30;
    this.gateOffsetY = 5;
    this.keyOffsetX = 0;
    this.keyOffsetY = 0;
    this.gateTriggerTiles = new Set();
    this.levelMap = null;
    this.keyCollected = false;
    this.levelCompleted = false;
    this.chests = null;
    this.coinsPerChest = 500;
    this.companion = null;
    this.companionMode = "hop";
    this.companionLastHop = 0;
    this.companionLastProgressAt = 0;
    this.companionLastDistance = null;
    this.companionFarSince = 0;
    this.companionFlyBase = null;
    this.companionShield = null;
    this.companionDebugGraphics = null;
    this.jumpCount = 0;
    this.wasGrounded = false;
    this.lastDownPressAt = 0;
    this.dashActive = false;
    this.dashDir = 0;
    this.dashLocked = false;
    this.dashLocked = false;
    this.editorPlacement = "earth";
    this.destroyEditorMenu();
    this.destroyGroup(this.coinsGroup);
    this.coinsGroup = null;
    this.destroyGroup(this.heartsGroup);
    this.heartsGroup = null;
    this.destroyGroup(this.molesGroup);
    this.molesGroup = null;
    if (this.moleAIs) {
      this.moleAIs.clear();
    }
    if (this.moleStates) {
      this.moleStates.clear();
    }
    if (this.moleAIs) {
      this.moleAIs.clear();
    }
  }

  init(data) {
    if (data?.mapKey) {
      this.mapKey = data.mapKey;
    }
    if (data?.levelId) {
      this.levelId = data.levelId;
    }
    if (data?.locationName) {
      this.locationName = data.locationName;
    }
  }

  create() {
    this.resetSceneState();
    this.loadLevelMap();
    this.addBackground();
    this.createPlayer();
    this.createBlocks();
    this.createCompanion();
    this.createUI();
    this.createAudio();
    playMusic(this, "music-world");
    this.ensureSaveState();
    this.events.once("shutdown", this.handleShutdown, this);
    this.events.once("destroy", this.handleShutdown, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D");
    this.input.keyboard.on("keydown-SPACE", () => this.digBlock());
    this.input.keyboard.on("keydown-THREE", () => this.toggleEditorMode());
    this.input.keyboard.on("keydown-FOUR", () => this.toggleHitboxEditor());
    this.input.keyboard.on("keydown-ESC", () => this.openExitPrompt());
    this.input.keyboard.on("keydown-T", () => this.useConsumable());
    this.input.keyboard.on("keydown-F", () => this.toggleFullscreen());
    this.input.mouse.disableContextMenu();
    this.input.on("pointerdown", this.handlePointerDown, this);
    this.coordDebugger = new CoordinateDebugger(this);
  }

  resetSceneState() {
    this.isPaused = false;
    this.isEditorMode = false;
    this.isHitboxEditMode = false;
    this.isSwinging = false;
    this.keyCollected = false;
    this.levelCompleted = false;
    this.facingX = 1;
    this.startCol = null;
    this.startRow = null;
    this.jumpCount = 0;
    this.wasGrounded = false;
    this.lastDownPressAt = 0;
    if (this.swingTimer) {
      this.swingTimer.remove(false);
      this.swingTimer = null;
    }
    if (this.gate) {
      this.gate.destroy();
      this.gate = null;
    }
    if (this.keyItem) {
      this.keyItem.destroy();
      this.keyItem = null;
    }
    this.destroyGroup(this.chests);
    this.chests = null;
    this.destroyGroup(this.coinsGroup);
    this.coinsGroup = null;
    this.destroyGroup(this.heartsGroup);
    this.heartsGroup = null;
    this.destroyGroup(this.molesGroup);
    this.molesGroup = null;
    if (this.moleAIs) {
      this.moleAIs.clear();
    }
    this.destroyGroup(this.blocks);
    this.blocks = null;
    if (this.blockMap) {
      this.blockMap.clear();
    }
    if (this.companionDebugGraphics) {
      this.companionDebugGraphics.destroy();
      this.companionDebugGraphics = null;
    }
    if (this.dashDebugGraphics) {
      this.dashDebugGraphics.destroy();
      this.dashDebugGraphics = null;
    }
    if (this.companionShield) {
      this.companionShield.destroy();
      this.companionShield = null;
    }
    if (this.playerBlockCollider) {
      this.physics?.world?.removeCollider(this.playerBlockCollider);
      this.playerBlockCollider = null;
    }
    if (this.companionBlockCollider) {
      this.physics?.world?.removeCollider(this.companionBlockCollider);
      this.companionBlockCollider = null;
    }
    if (this.physics?.world?.isPaused) {
      this.physics.world.resume();
    }
    if (this.time?.paused) {
      this.time.paused = false;
    }
  }

  destroyGroup(group) {
    if (!group) return;
    if (group.destroy) {
      group.destroy(true);
      return;
    }
    if (group.clear) {
      group.clear(true, true);
    }
  }

  destroyEditorMenu() {
    if (!this.editorMenu) return;
    this.editorMenu.container.destroy();
    this.editorMenu = null;
  }

  handleShutdown() {
    this.isPaused = true;
    if (this.sfx?.levitating?.isPlaying) {
      this.sfx.levitating.stop();
    }
    this.destroyGroup(this.chests);
    this.chests = null;
    this.destroyGroup(this.coinsGroup);
    this.coinsGroup = null;
    this.destroyGroup(this.heartsGroup);
    this.heartsGroup = null;
    this.destroyGroup(this.molesGroup);
    this.molesGroup = null;
    this.destroyGroup(this.blocks);
    this.blocks = null;
    if (this.playerBlockCollider) {
      this.physics?.world?.removeCollider(this.playerBlockCollider);
      this.playerBlockCollider = null;
    }
    if (this.companionBlockCollider) {
      this.physics?.world?.removeCollider(this.companionBlockCollider);
      this.companionBlockCollider = null;
    }
    if (this.physics?.world) {
      this.physics.world.pause();
    }
  }

  ensureSaveState() {
    const saveData = this.registry.get("saveData") || {};
    if (saveData.currentLevel !== this.levelId) {
      const nextSave = {
        ...saveData,
        currentLevel: this.levelId,
      };
      this.registry.set("saveData", nextSave);
      saveProgress(nextSave);
    }
  }

  loadLevelMap() {
    const cached = this.cache.json?.get(this.mapKey);
    if (cached) {
      this.levelMap = cached;
      return;
    }
    if (!this.levelMap) {
      this.levelMap = {
        tileSize: 38,
        start: { col: 2, row: 13 },
        blocks: [],
      };
    }
  }

  addBackground() {
    const tileSize = this.levelMap?.tileSize ?? 38;
    const cols = this.levelMap?.cols ?? Math.ceil(960 / tileSize);
    const rows = this.levelMap?.rows ?? Math.ceil(600 / tileSize);
    const width = Math.max(960, cols * tileSize);
    const height = Math.max(600, rows * tileSize);
    const baseKey = "underground-bg";
    const altKey = "underground-bg-alt";
    const baseImage = this.textures.get(baseKey)?.getSourceImage();
    const baseWidth = baseImage?.width ?? 960;
    const baseHeight = baseImage?.height ?? 600;
    const scale = Math.max(960 / baseWidth, 600 / baseHeight);
    const scaledWidth = baseWidth * scale;
    let x = scaledWidth / 2;
    let index = 0;
    while (x - scaledWidth / 2 < width) {
      const key = index % 2 === 0 ? baseKey : altKey;
      const bg = this.add.image(x, height / 2, key);
      bg.setScale(scale);
      bg.setDepth(-2);
      x += scaledWidth;
      index += 1;
    }
  }

  createPlayer() {
    const saveData = this.registry.get("saveData") || {};
    const isFemale = saveData.playerGender === "female";
    const standingTexture = isFemale ? "knight-female-standing" : "knight-standing";
    const hitTexture = isFemale ? "knight-female-hitting" : "knight-hitting";
    const crouchTexture = isFemale ? "knight-female-crouching" : "knight-crouching";
    const crouchHitTexture = isFemale
      ? "knight-female-crouching-hitting"
      : "knight-crouching-hitting";

    this.player = this.physics.add.image(240, 180, standingTexture);
    this.player.setOrigin(0.5, 1);
    this.player.setScale(this.standScale, this.standScale);
    this.player.setDepth(0);
    this.standDisplayWidth = this.player.displayWidth;
    this.standDisplayHeight = this.player.displayHeight;
    this.hitboxConfig = {
      widthPx: 60,
      heightPx: 110,
      offsetX: 40,
      offsetY: 35,
    };
    this.hitboxConfig.bottomOffsetPx =
      this.player.displayHeight -
      (this.hitboxConfig.offsetY + this.hitboxConfig.heightPx);
    this.player.setCollideWorldBounds(true);
    this.applyPlayerBody(this.standBodyHeight);
    this.player.body.setBounce(0);
    this.player.setData("isEditorPlayer", true);
    this.player.setData("standingTexture", standingTexture);
    this.player.setData("hitTexture", hitTexture);
    this.player.setData("crouchTexture", crouchTexture);
    this.player.setData("crouchHitTexture", crouchHitTexture);
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.physics.world.gravity.y = 900;

    this.swordHitbox = this.add.rectangle(-100, -100, 47, 32, 0xffffff, 0.12);
    this.swordHitbox.setStrokeStyle(2, 0xffffff, 0.5);
    this.swordHitbox.setVisible(this.debugHitboxes);
    this.swordHitbox.setDepth(20);
  }

  applyPlayerBody(heightFactor) {
    if (!this.player?.body) return;
    const scaleFactor = this.standDisplayHeight
      ? this.player.displayHeight / this.standDisplayHeight
      : 1;
    const baseWidth = this.hitboxConfig?.widthPx ?? this.player.displayWidth * 0.24;
    const baseHeight = this.hitboxConfig?.heightPx ?? this.player.displayHeight * 0.7;
    const bodyWidth = baseWidth * scaleFactor;
    const bodyHeight = baseHeight * scaleFactor * heightFactor;
    this.player.body.setSize(bodyWidth, bodyHeight, false);
    const baseOffsetX = this.hitboxConfig?.offsetX ?? (this.player.displayWidth - bodyWidth) * 0.5;
    const baseBottomOffset = this.hitboxConfig?.bottomOffsetPx ?? 0;
    const offsetX = baseOffsetX * scaleFactor;
    const bottomOffsetPx = baseBottomOffset * scaleFactor;
    const offsetY = this.player.displayHeight - bodyHeight - bottomOffsetPx;
    this.player.body.setOffset(offsetX, offsetY);
  }

  getStandHitboxRect() {
    if (!this.player) return null;
    const standDisplayWidth = this.player.width * this.standScale;
    const standDisplayHeight = this.player.height * this.standScale;
    const scaleFactor = standDisplayWidth / this.player.width;
    const width = (this.hitboxConfig?.widthPx ?? 0) * scaleFactor;
    const height = (this.hitboxConfig?.heightPx ?? 0) * scaleFactor;
    const offsetX = (this.hitboxConfig?.offsetX ?? 0) * scaleFactor;
    const offsetY = (this.hitboxConfig?.offsetY ?? 0) * scaleFactor;
    const topLeftX = this.player.x - standDisplayWidth / 2 + offsetX;
    const topLeftY = this.getPlayerFeetY() - standDisplayHeight + offsetY;
    return new Phaser.Geom.Rectangle(topLeftX, topLeftY, width, height);
  }

  getPlayerFeetY() {
    return this.player.y;
  }

  setPlayerFeetY(footY) {
    this.player.y = footY;
  }

  setPlayerFeetPosition(col, row) {
    this.player.x = (col + 0.5) * this.tileSize;
    const footY = row * this.tileSize;
    this.setPlayerFeetY(footY);
  }

  createBlocks() {
    const tileSize =
      this.levelMap?.tileSize ??
      Math.round(Math.min(this.player.displayWidth, this.player.displayHeight) / 2);
    this.tileSize = Math.max(16, tileSize);
    this.dashBounceDistance = this.tileSize;
    this.createBlockTextures();
    this.blocks = this.physics.add.staticGroup();
    this.blockMap.clear();

    const cols = this.levelMap?.cols ?? Math.ceil(960 / this.tileSize);
    const rows = this.levelMap?.rows ?? Math.ceil(600 / this.tileSize);
    this.gridCols = cols;
    this.gridRows = rows;
    this.worldWidth = cols * this.tileSize;
    this.worldHeight = rows * this.tileSize;
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.worldWidth, this.worldHeight);
    camera.setScroll(0, 0);
    this.scrollXEnabled = Boolean(this.levelMap?.scrollX);
    const spawnCol = this.startCol ?? this.levelMap?.start?.col ?? Math.min(cols - 2, 3);
    const spawnRow = this.startRow ?? this.levelMap?.start?.row ?? Math.min(rows - 2, 3);
    this.startCol = spawnCol;
    this.startRow = spawnRow;
    this.setPlayerFeetPosition(spawnCol, spawnRow);

    if (this.levelMap?.blocks?.length) {
      this.levelMap.blocks.forEach((block) => {
        this.placeBlock(block.col, block.row, block.type);
      });
    }

    this.applyBoundaryBlocks();
    this.disableGate = Boolean(this.levelMap?.disableGate);
    this.disableKey = Boolean(this.levelMap?.disableKey);
    this.disableChests = Boolean(this.levelMap?.disableChests);
    if (!this.disableGate) {
      this.placeGate();
      this.setGateTriggerTiles();
    } else {
      this.gateTriggerTiles = new Set();
    }
    if (!this.disableKey) {
      this.placeKey();
    }
    this.placeMapItems();
    this.playerBlockCollider = this.physics.add.collider(this.player, this.blocks);
  }

  placeMapItems() {
    this.createItemGroups();
    const mapChests = Array.isArray(this.levelMap?.chests) && this.levelMap.chests.length > 0;
    if (mapChests) {
      this.placeMapChests(this.levelMap.chests);
    } else if (!this.disableChests) {
      this.placeChests();
    }
    if (Array.isArray(this.levelMap?.coins)) {
      this.placeMapCoins(this.levelMap.coins);
    }
    if (Array.isArray(this.levelMap?.hearts)) {
      this.placeMapHearts(this.levelMap.hearts);
    }
    if (Array.isArray(this.levelMap?.moles)) {
      this.placeMapMoles(this.levelMap.moles);
    }
  }

  createItemGroups() {
    if (!this.coinsGroup) {
      this.coinsGroup = this.physics.add.staticGroup();
      this.physics.add.overlap(this.player, this.coinsGroup, this.handleCoinPickup, null, this);
    }
    if (!this.heartsGroup) {
      this.heartsGroup = this.physics.add.staticGroup();
      this.physics.add.overlap(this.player, this.heartsGroup, this.handleHeartPickup, null, this);
    }
    if (!this.molesGroup) {
      this.molesGroup = this.physics.add.group();
      this.physics.add.collider(this.molesGroup, this.blocks);
    }
  }

  createCompanion() {
    if (this.companion) {
      this.companion.destroy();
      this.companion = null;
    }
    this.companion = this.physics.add.image(this.player.x, this.player.y, "companion-running");
    this.companion.setOrigin(0.5, 1);
    this.companion.setScale(0.48);
    this.companion.setDepth(0);
    this.companion.body.setSize(20, 26, true);
    this.companion.body.setCollideWorldBounds(true);
    this.companionBlockCollider = this.physics.add.collider(this.companion, this.blocks);
    const targetTile = this.getCompanionTargetTile() || {
      col: Math.floor(this.player.x / this.tileSize),
      row: Math.floor((this.player.y - 1) / this.tileSize),
    };
    this.companion.setPosition(
      (targetTile.col + 0.5) * this.tileSize,
      (targetTile.row + 1) * this.tileSize
    );
    if (this.companion.body) {
      this.companion.body.reset(this.companion.x, this.companion.y);
    }
    this.companion.body.setVelocity(0, 0);
    if (this.companionDebugGraphics) {
      this.companionDebugGraphics.destroy();
      this.companionDebugGraphics = null;
    }
    if (!this.companionShield) {
      this.companionShield = this.add.ellipse(this.companion.x, this.companion.y - 14, 36, 36, 0x5fb8ff, 0.15);
      this.companionShield.setStrokeStyle(2, 0x8fd2ff, 0.9);
      this.companionShield.setDepth(6);
      this.companionShield.setVisible(false);
    }
    this.companionMode = "hop";
    this.companionLastHop = 0;
    this.companionLastProgressAt = 0;
    this.companionLastDistance = null;
    this.companionFarSince = 0;
    this.companionFlyBase = null;
  }

  toggleHitboxEditor() {
    if (this.isEditorMode) return;
    if (this.isHitboxEditMode) {
      this.isHitboxEditMode = false;
      this.time.paused = false;
      this.physics.world.resume();
      this.logHitboxEditorResult();
      this.destroyHitboxEditor();
      return;
    }
    this.isHitboxEditMode = true;
    this.time.paused = true;
    this.physics.world.pause();
    this.createHitboxEditor();
  }

  createHitboxEditor() {
    if (!this.player?.body) return;
    const body = this.player.body;
    const box = this.add
      .rectangle(body.x + body.width / 2, body.y + body.height / 2, body.width, body.height)
      .setStrokeStyle(2, 0x00ff66)
      .setFillStyle(0x00ff66, 0.05)
      .setDepth(120)
      .setInteractive({ draggable: true });
    this.input.setDraggable(box);

    const handleSize = 10;
    const makeHandle = (name) =>
      this.add
        .rectangle(0, 0, handleSize, handleSize, 0xffcc00, 0.8)
        .setStrokeStyle(1, 0x8a6b44)
        .setDepth(121)
        .setInteractive({ draggable: true })
        .setData("handle", name);

    const handles = {
      tl: makeHandle("tl"),
      tr: makeHandle("tr"),
      bl: makeHandle("bl"),
      br: makeHandle("br"),
    };
    Object.values(handles).forEach((handle) => this.input.setDraggable(handle));

    this.hitboxEditor = { box, handles };
    this.updateHitboxHandles();

    this.input.on("drag", this.handleHitboxDrag, this);
  }

  destroyHitboxEditor() {
    if (!this.hitboxEditor) return;
    this.input.off("drag", this.handleHitboxDrag, this);
    const { box, handles } = this.hitboxEditor;
    box?.destroy();
    Object.values(handles || {}).forEach((handle) => handle?.destroy());
    this.hitboxEditor = null;
  }

  updateHitboxHandles() {
    if (!this.hitboxEditor) return;
    const { box, handles } = this.hitboxEditor;
    const left = box.x - box.width / 2;
    const right = box.x + box.width / 2;
    const top = box.y - box.height / 2;
    const bottom = box.y + box.height / 2;
    handles.tl.setPosition(left, top);
    handles.tr.setPosition(right, top);
    handles.bl.setPosition(left, bottom);
    handles.br.setPosition(right, bottom);
  }

  handleHitboxDrag(pointer, gameObject, dragX, dragY) {
    if (!this.isHitboxEditMode || !this.hitboxEditor) return;
    const { box } = this.hitboxEditor;
    if (gameObject === box) {
      box.setPosition(dragX, dragY);
      this.updateHitboxHandles();
      return;
    }
    const handle = gameObject.getData("handle");
    if (!handle) return;
    const left = box.x - box.width / 2;
    const right = box.x + box.width / 2;
    const top = box.y - box.height / 2;
    const bottom = box.y + box.height / 2;
    let newLeft = left;
    let newRight = right;
    let newTop = top;
    let newBottom = bottom;
    if (handle.includes("l")) newLeft = dragX;
    if (handle.includes("r")) newRight = dragX;
    if (handle.includes("t")) newTop = dragY;
    if (handle.includes("b")) newBottom = dragY;
    const minSize = 10;
    const width = Math.max(minSize, newRight - newLeft);
    const height = Math.max(minSize, newBottom - newTop);
    box.setSize(width, height);
    box.setPosition(newLeft + width / 2, newTop + height / 2);
    this.updateHitboxHandles();
  }

  logHitboxEditorResult() {
    if (!this.hitboxEditor || !this.player) return;
    const { box } = this.hitboxEditor;
    const displayWidth = this.player.displayWidth;
    const displayHeight = this.player.displayHeight;
    const spriteTopLeftX = this.player.x - displayWidth / 2;
    const spriteTopLeftY = this.player.y - displayHeight;
    const offsetX = box.x - box.width / 2 - spriteTopLeftX;
    const offsetY = box.y - box.height / 2 - spriteTopLeftY;
    const widthRatio = box.width / displayWidth;
    const heightRatio = box.height / displayHeight;
    console.log("UndergroundDigHitbox:", {
      offsetX: Math.round(offsetX),
      offsetY: Math.round(offsetY),
      width: Math.round(box.width),
      height: Math.round(box.height),
      widthRatio: Number(widthRatio.toFixed(3)),
      heightRatio: Number(heightRatio.toFixed(3)),
    });
  }

  createBlockTextures() {
    const size = this.tileSize;
    const createTexture = (key, fill, stroke) => {
      if (this.textures.exists(key)) return;
      const gfx = this.make.graphics({ x: 0, y: 0, add: false });
      gfx.fillStyle(fill, 1);
      gfx.fillRect(0, 0, size, size);
      gfx.lineStyle(2, stroke, 1);
      gfx.strokeRect(0, 0, size, size);
      gfx.generateTexture(key, size, size);
      gfx.destroy();
    };

    createTexture("block-stone", 0x7a7f86, 0x3c4047);
    createTexture("block-black", 0x141414, 0x000000);
  }

  placeBlock(col, row, type, force = false) {
    const key = `${col},${row}`;
    const existing = this.blockMap.get(key);
    if (existing) {
      if (!force || existing.getData("type") === type) return;
      this.blocks.remove(existing, true, true);
      this.blockMap.delete(key);
    }
    const texture =
      type === "black"
        ? "underground-onyx"
        : type === "stone"
          ? "underground-stone"
          : type === "coin"
            ? "underground-coin"
            : "underground-earth";
    const x = col * this.tileSize;
    const y = row * this.tileSize;
    const block = this.blocks.create(x, y, texture);
    block.setOrigin(0, 0);
    block.setDepth(1);
    block.setDisplaySize(this.tileSize, this.tileSize);
    if (block.refreshBody) {
      block.refreshBody();
    }
    block.setData("type", type);
    block.setData("col", col);
    block.setData("row", row);
    block.setData("coinHits", type === "coin" ? 3 : 0);
    block.setData("lastClickAt", 0);
    this.blockMap.set(key, block);
  }

  applyBoundaryBlocks() {
    const maxCol = Math.max(0, (this.gridCols ?? 1) - 1);
    const maxRow = Math.max(0, (this.gridRows ?? 1) - 1);
    for (let col = 0; col <= maxCol; col += 1) {
      this.placeBlock(col, 0, "black", true);
      this.placeBlock(col, maxRow, "black", true);
    }
    for (let row = 0; row <= maxRow; row += 1) {
      this.placeBlock(0, row, "black", true);
      this.placeBlock(maxCol, row, "black", true);
    }
  }

  placeMapCoins(list) {
    if (!this.coinsGroup) return;
    list.forEach((entry) => {
      const col = entry?.col;
      const row = entry?.row;
      if (!Number.isFinite(col) || !Number.isFinite(row)) return;
      this.placeCoinAt(col, row);
    });
  }

  placeCoinAt(col, row) {
    if (!this.coinsGroup) return;
    if (this.blockMap.has(`${col},${row}`)) return;
    if (this.hasItemAt(this.coinsGroup, col, row)) return;
    const coin = this.coinsGroup.create(
      (col + 0.5) * this.tileSize,
      (row + 1) * this.tileSize,
      "ui-coin"
    );
    coin.setOrigin(0.5, 1);
    coin.setScale(0.35);
    coin.setDepth(2);
    coin.setData("col", col);
    coin.setData("row", row);
  }

  placeMapHearts(list) {
    if (!this.heartsGroup) return;
    list.forEach((entry) => {
      const col = entry?.col;
      const row = entry?.row;
      if (!Number.isFinite(col) || !Number.isFinite(row)) return;
      this.placeHeartAt(col, row);
    });
  }

  placeHeartAt(col, row) {
    if (!this.heartsGroup) return;
    if (this.blockMap.has(`${col},${row}`)) return;
    if (this.hasItemAt(this.heartsGroup, col, row)) return;
    const heart = this.heartsGroup.create(
      (col + 0.5) * this.tileSize,
      (row + 1) * this.tileSize,
      "ui-heart"
    );
    heart.setOrigin(0.5, 1);
    heart.setScale(0.45);
    heart.setDepth(2);
    heart.setData("col", col);
    heart.setData("row", row);
  }

  placeMapChests(list) {
    this.placeMapChestsWithMode(list, true);
  }

  placeMapChestsWithMode(list, replaceAll) {
    if (replaceAll || !this.chests) {
      if (this.chests) {
        this.chests.clear(true, true);
      }
      this.chests = this.physics.add.staticGroup();
    }
    list.forEach((entry) => {
      const col = entry?.col;
      const row = entry?.row;
      if (!Number.isFinite(col) || !Number.isFinite(row)) return;
      if (this.blockMap.has(`${col},${row}`)) return;
      if (this.hasItemAt(this.chests, col, row)) return;
      const chest = this.add.image(
        (col + 0.5) * this.tileSize,
        (row + 1) * this.tileSize + 20,
        "chest-closed"
      );
      chest.setScale(0.45);
      chest.setDepth(2);
      chest.setData("opened", false);
      chest.setData("col", col);
      chest.setData("row", row);
      this.physics.add.existing(chest, true);
      this.chests.add(chest);
    });
  }

  hasItemAt(group, col, row) {
    if (!group?.getChildren) return false;
    const items = group.getChildren();
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!item.active) continue;
      if (item.getData("col") === col && item.getData("row") === row) {
        return true;
      }
    }
    return false;
  }

  placeChestAt(col, row) {
    this.placeMapChestsWithMode([{ col, row }], false);
  }

  placeMapMoles(list) {
    if (!this.molesGroup) return;
    list.forEach((entry) => {
      const col = entry?.col;
      const row = entry?.row;
      if (!Number.isFinite(col) || !Number.isFinite(row)) return;
      this.placeMoleAt(col, row);
    });
  }

  placeMoleAt(col, row) {
    if (!this.molesGroup) return;
    if (this.hasItemAt(this.molesGroup, col, row)) return;
    if (this.blockMap.has(`${col},${row}`)) return;
    const mole = this.molesGroup.create(
      (col + 0.5) * this.tileSize,
      (row + 1) * this.tileSize,
      "desert-mole-running"
    );
    mole.setOrigin(0.5, 1);
    mole.setDepth(2);
    mole.setScale(0.6);
    mole.setData("col", col);
    mole.setData("row", row);
    mole.setData("hp", 3);
    mole.setData("maxHp", 3);
    if (mole.body) {
      mole.body.setCollideWorldBounds(true);
      mole.body.setAllowGravity(false);
    }
    this.createMoleBar(mole);
    const ai = new DesertMoleAI(this, mole, {
      tileSize: this.tileSize,
      blockMap: this.blockMap,
      onDig: (digCol, digRow) => this.removeEarthAt(digCol, digRow),
      digSoundKey: "sfx-monster-dig",
      attackTexture: "desert-mole-attacking",
      runTexture: "desert-mole-running",
      canSeePlayer: () => this.moleCanSeePlayer(mole),
      getPlayerPos: () => ({ x: this.player.x, y: this.player.y }),
      onAttack: () => this.applyMoleAttack(mole),
    });
    this.moleAIs.set(mole, ai);
  }

  placeGate() {
    const gateData = this.levelMap?.gate;
    let gateCol = this.startCol ?? 0;
    let gateRow = null;
    if (gateData && Number.isFinite(gateData.col) && Number.isFinite(gateData.row)) {
      gateCol = gateData.col;
      gateRow = gateData.row;
    } else {
      for (let row = (this.startRow ?? 0) - 1; row >= 0; row -= 1) {
        const block = this.blockMap.get(`${gateCol},${row}`);
        if (block && block.getData("type") !== "earth") {
          gateRow = row;
          break;
        }
      }
    }
    if (gateRow === null) return;
    if (this.gate) {
      this.gate.destroy();
      this.gate = null;
    }
    const gateX = (gateCol + 0.5) * this.tileSize + this.gateOffsetX;
    const gateY = gateRow * this.tileSize + this.gateOffsetY;
    this.gate = this.add.image(gateX, gateY, "underground-gate");
    this.gate.setOrigin(0.5, 1);
    this.gate.setScale(this.standScale);
    this.gate.setDepth(-1);
  }

  placeKey() {
    const keyData = this.levelMap?.key;
    let keyCol = (this.startCol ?? 0) + 1;
    let keyRow = this.startRow ?? 0;
    const saveData = this.registry.get("saveData") || {};
    if (saveData.undergroundKeyCollected) {
      if (this.keyItem) {
        this.keyItem.destroy();
        this.keyItem = null;
      }
      return;
    }
    if (keyData && Number.isFinite(keyData.col) && Number.isFinite(keyData.row)) {
      keyCol = keyData.col;
      keyRow = keyData.row;
    }
    keyCol = Phaser.Math.Clamp(keyCol, 1, (this.gridCols ?? 1) - 2);
    keyRow = Phaser.Math.Clamp(keyRow, 1, (this.gridRows ?? 1) - 2);
    if (this.keyItem) {
      this.keyItem.destroy();
      this.keyItem = null;
    }
    const keyX = (keyCol + 0.5) * this.tileSize + this.keyOffsetX;
    const keyY = (keyRow + 1) * this.tileSize + this.keyOffsetY;
    this.keyItem = this.add.image(keyX, keyY, "ui-key");
    this.keyItem.setOrigin(0.5, 1);
    this.keyItem.setScale(0.55);
    this.keyItem.setDepth(2);
  }

  placeChests() {
    if (!this.tileSize || !this.blockMap) return;
    if (this.chests) {
      this.chests.clear(true, true);
    }
    this.chests = this.physics.add.staticGroup();
    const saveData = this.registry.get("saveData") || {};
    const openedChests = saveData.undergroundDigChests || {};
    const emptyAt = (col, row) => !this.blockMap.has(`${col},${row}`);
    const clampCol = (col) => Phaser.Math.Clamp(col, 1, (this.gridCols ?? 1) - 2);
    const clampRow = (row) => Phaser.Math.Clamp(row, 1, (this.gridRows ?? 1) - 2);

    const gatePos = this.getGateGridPos();
    const gateCol = gatePos?.col ?? this.startCol ?? 1;
    const gateRow = gatePos?.row ?? this.startRow ?? 1;
    let chest1Row = clampRow(gateRow - 6);
    let chest1Col = clampCol(gateCol - 1);
    for (let offset = 0; offset <= 4; offset += 1) {
      const testRow = clampRow(chest1Row - offset);
      if (emptyAt(chest1Col, testRow)) {
        chest1Row = testRow;
        break;
      }
    }

    let chest2Col = clampCol((this.gridCols ?? 2) - 2);
    let chest2Row = 1;
    let found = false;
    for (let row = 1; row <= (this.gridRows ?? 1) - 2 && !found; row += 1) {
      for (let col = (this.gridCols ?? 2) - 2; col >= 1; col -= 1) {
        if (emptyAt(col, row)) {
          chest2Col = col;
          chest2Row = row;
          found = true;
          break;
        }
      }
    }

    const spots = [
      { id: "gate", col: chest1Col, row: chest1Row },
      { id: "topRight", col: chest2Col, row: chest2Row },
    ];
    spots.forEach((spot) => {
      const chest = this.add.image(
        (spot.col + 0.5) * this.tileSize,
        (spot.row + 1) * this.tileSize + 20,
        "chest-closed"
      );
      chest.setScale(0.45);
      chest.setDepth(2);
      chest.setData("id", spot.id);
      const alreadyOpened = Boolean(openedChests[spot.id]);
      chest.setData("opened", alreadyOpened);
      if (alreadyOpened) {
        chest.setTexture("chest-opened");
      }
      this.physics.add.existing(chest, true);
      this.chests.add(chest);
    });
  }

  setGateTriggerTiles() {
    if (this.disableGate) return;
    if (!this.tileSize) return;
    const rect = { x: 84, y: 391, width: 26, height: 24 };
    const colStart = Math.floor(rect.x / this.tileSize);
    const colEnd = Math.floor((rect.x + rect.width - 1) / this.tileSize);
    const rowStart = Math.floor(rect.y / this.tileSize);
    const rowEnd = Math.floor((rect.y + rect.height - 1) / this.tileSize);
    const targetRow = Math.max(rowStart, rowEnd);
    const tiles = new Set();
    for (let col = colStart; col <= colEnd; col += 1) {
      tiles.add(`${col},${targetRow}`);
    }
    this.gateTriggerTiles = tiles;
  }

  getGateGridPos() {
    if (!this.gate || !this.tileSize) return null;
    const col = Math.floor((this.gate.x - this.gateOffsetX) / this.tileSize);
    const row = Math.floor((this.gate.y - this.gateOffsetY) / this.tileSize);
    return { col, row };
  }

  getKeyGridPos() {
    if (!this.keyItem || !this.tileSize) return null;
    const col = Math.floor((this.keyItem.x - this.keyOffsetX) / this.tileSize);
    const row = Math.floor((this.keyItem.y - this.keyOffsetY) / this.tileSize) - 1;
    return { col, row };
  }

  enableEditorControls() {
    this.createItemGroups();
    this.blocks.getChildren().forEach((block) => {
      if (block.getData("type") === "black") return;
      block.setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(block);
    });
    this.player.setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(this.player);
    if (this.gate) {
      this.gate.setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(this.gate);
    }
    if (this.keyItem) {
      this.keyItem.setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(this.keyItem);
    }
    if (this.player.body) {
      this.player.body.enable = false;
    }

    this.input.on("dragstart", this.handleDragStart, this);
    this.input.on("drag", this.handleDragMove, this);
    this.input.on("dragend", this.handleDragEnd, this);
    this.input.on("gameobjectdown", this.handleBlockClick, this);
  }

  disableEditorControls() {
    this.input.off("dragstart", this.handleDragStart, this);
    this.input.off("drag", this.handleDragMove, this);
    this.input.off("dragend", this.handleDragEnd, this);
    this.input.off("gameobjectdown", this.handleBlockClick, this);
    this.blocks.getChildren().forEach((block) => {
      block.disableInteractive();
    });
    this.player.disableInteractive();
    if (this.gate) {
      this.gate.disableInteractive();
    }
    if (this.keyItem) {
      this.keyItem.disableInteractive();
    }
    if (this.player.body) {
      this.player.body.enable = true;
    }
  }

  toggleEditorMode() {
    if (this.isEditorMode) {
      this.isEditorMode = false;
      this.disableEditorControls();
      this.destroyEditorMenu();
      this.time.paused = false;
      this.physics.world.resume();
      this.logMapToConsole();
      return;
    }
    this.isEditorMode = true;
    this.time.paused = true;
    this.physics.world.pause();
    this.enableEditorControls();
  }

  handleDragStart(pointer, block) {
    if (
      !this.isEditorMode ||
      (!block?.getData && block !== this.gate && block !== this.keyItem && block !== this.player)
    ) {
      return;
    }
    if (block.getData && block.getData("type") === "black") return;
    if (block === this.gate) {
      block.setData("dragStartX", block.x);
      block.setData("dragStartY", block.y);
      return;
    }
    if (block === this.keyItem) {
      block.setData("dragStartX", block.x);
      block.setData("dragStartY", block.y);
      return;
    }
    if (block === this.player) {
      block.setData("dragStartCol", this.startCol);
      block.setData("dragStartRow", this.startRow);
      return;
    }
    block.setData("dragStartCol", block.getData("col"));
    block.setData("dragStartRow", block.getData("row"));
  }

  handleDragMove(pointer, block, dragX, dragY) {
    if (!this.isEditorMode || !block) return;
    if (block === this.gate) {
      block.x = Phaser.Math.Clamp(dragX, 0, this.worldWidth);
      block.y = Phaser.Math.Clamp(dragY, 0, this.worldHeight);
      return;
    }
    if (block === this.keyItem) {
      block.x = Phaser.Math.Clamp(dragX, 0, this.worldWidth);
      block.y = Phaser.Math.Clamp(dragY, 0, this.worldHeight);
      return;
    }
    if (!block.getData) return;
    if (block.getData("type") === "black") return;
    const col = Phaser.Math.Clamp(
      Math.floor(dragX / this.tileSize),
      0,
      Math.floor(this.worldWidth / this.tileSize)
    );
    const row = Phaser.Math.Clamp(
      Math.floor(dragY / this.tileSize),
      0,
      Math.floor(this.worldHeight / this.tileSize)
    );
    if (block === this.player) {
      this.setPlayerFeetPosition(col, row);
      return;
    }
    block.x = col * this.tileSize;
    block.y = row * this.tileSize;
  }

  handleDragEnd(pointer, block) {
    if (!this.isEditorMode || !block) return;
    if (block === this.gate) {
      const snappedCol = Phaser.Math.Clamp(
        Math.floor(block.x / this.tileSize),
        0,
        (this.gridCols ?? 1) - 1
      );
      const snappedRow = Phaser.Math.Clamp(
        Math.floor(block.y / this.tileSize),
        0,
        (this.gridRows ?? 1) - 1
      );
      block.x = (snappedCol + 0.5) * this.tileSize + this.gateOffsetX;
      block.y = (snappedRow + 1) * this.tileSize + this.gateOffsetY;
      return;
    }
    if (block === this.keyItem) {
      const snappedCol = Phaser.Math.Clamp(
        Math.floor(block.x / this.tileSize),
        0,
        (this.gridCols ?? 1) - 1
      );
      const snappedRow = Phaser.Math.Clamp(
        Math.floor(block.y / this.tileSize),
        0,
        (this.gridRows ?? 1) - 1
      );
      block.x = (snappedCol + 0.5) * this.tileSize + this.keyOffsetX;
      block.y = (snappedRow + 1) * this.tileSize + this.keyOffsetY;
      return;
    }
    if (!block.getData) return;
    if (block.getData("type") === "black") return;
    const col = Math.floor(block.x / this.tileSize);
    const row = Math.floor(block.y / this.tileSize);
    if (block === this.player) {
      this.startCol = col;
      this.startRow = row;
      this.setPlayerFeetPosition(col, row);
      return;
    }
    const key = `${col},${row}`;
    const startCol = block.getData("dragStartCol");
    const startRow = block.getData("dragStartRow");
    const startKey = `${startCol},${startRow}`;
    if (this.blockMap.has(key) && this.blockMap.get(key) !== block) {
      block.x = startCol * this.tileSize;
      block.y = startRow * this.tileSize;
      if (block.body) {
        if (block.refreshBody) {
          block.refreshBody();
        } else if (block.body.updateFromGameObject) {
          block.body.updateFromGameObject();
        }
      }
      return;
    }
    if (startKey !== key) {
      this.blockMap.delete(startKey);
      this.blockMap.set(key, block);
      block.setData("col", col);
      block.setData("row", row);
    }
    if (block.body) {
      if (block.refreshBody) {
        block.refreshBody();
      } else if (block.body.updateFromGameObject) {
        block.body.updateFromGameObject();
      }
    }
  }

  handleBlockClick(pointer, block) {
    if (!this.isEditorMode || !block?.getData) return;
    if (block === this.player || block === this.gate || block === this.keyItem) return;
  }

  logMapToConsole() {
    const blocks = [];
    this.blockMap.forEach((block) => {
      if (!block.active) return;
      blocks.push({
        col: block.getData("col"),
        row: block.getData("row"),
        type: block.getData("type"),
      });
    });
    blocks.sort((a, b) => (a.row - b.row) || (a.col - b.col));
    const coins = this.collectGroupItems(this.coinsGroup);
    const hearts = this.collectGroupItems(this.heartsGroup);
    const chests = this.collectGroupItems(this.chests);
    const moles = this.collectGroupItems(this.molesGroup);
    const payload = {
      tileSize: this.tileSize,
      cols: this.gridCols,
      rows: this.gridRows,
      scrollX: this.scrollXEnabled,
      disableGate: this.disableGate,
      disableKey: this.disableKey,
      disableChests: this.disableChests,
      start: { col: this.startCol ?? 0, row: this.startRow ?? 0 },
      gate: this.disableGate ? null : this.getGateGridPos(),
      key: this.disableKey ? null : this.getKeyGridPos(),
      blocks,
      coins,
      chests,
      hearts,
      moles,
    };
    console.log("UndergroundDigMap:", JSON.stringify(payload));
  }

  collectGroupItems(group) {
    if (!group?.getChildren) return [];
    const items = [];
    group.getChildren().forEach((item) => {
      if (!item.active) return;
      const col = item.getData("col");
      const row = item.getData("row");
      if (!Number.isFinite(col) || !Number.isFinite(row)) return;
      items.push({ col, row });
    });
    items.sort((a, b) => (a.row - b.row) || (a.col - b.col));
    return items;
  }

  handlePointerDown(pointer) {
    if (!this.isEditorMode) return;
    if (pointer.rightButtonDown()) {
      this.openEditorMenu(pointer);
      return;
    }
    if (this.editorMenu?.visible) {
      return;
    }
    const col = Math.floor(pointer.worldX / this.tileSize);
    const row = Math.floor(pointer.worldY / this.tileSize);
    if (this.editorPlacement === "remove") {
      this.removeEditorItemAt(col, row);
      return;
    }
    if (this.editorPlacement === "earth") {
      this.placeEditorBlock(pointer, "earth");
      return;
    }
    if (this.editorPlacement === "stone") {
      this.placeEditorBlock(pointer, "stone");
      return;
    }
    if (this.editorPlacement === "black") {
      this.placeEditorBlock(pointer, "black");
      return;
    }
    if (this.editorPlacement === "coin") {
      this.placeCoinAt(col, row);
      return;
    }
    if (this.editorPlacement === "coinTile") {
      this.placeEditorBlock(pointer, "coin");
      return;
    }
    if (this.editorPlacement === "chest") {
      this.placeChestAt(col, row);
      return;
    }
    if (this.editorPlacement === "heart") {
      this.placeHeartAt(col, row);
      return;
    }
    if (this.editorPlacement === "key") {
      this.placeKeyAt(col, row);
      return;
    }
    if (this.editorPlacement === "exit") {
      this.placeGateAt(col, row);
      return;
    }
    if (this.editorPlacement === "mole") {
      this.placeMoleAt(col, row);
      return;
    }
  }

  openEditorMenu(pointer) {
    const options = [
      { label: "Remove", value: "remove" },
      { label: "Earth", value: "earth" },
      { label: "Stone", value: "stone" },
      { label: "Onyx", value: "black" },
      { label: "Coin", value: "coin" },
      { label: "Coin Tile", value: "coinTile" },
      { label: "Treasure Chest", value: "chest" },
      { label: "Exit Door", value: "exit" },
      { label: "Key", value: "key" },
      { label: "Heart", value: "heart" },
      { label: "Desert Mole", value: "mole" },
    ];
    this.destroyEditorMenu();
    const padding = 6;
    const lineHeight = 18;
    const width = 160;
    const height = padding * 2 + options.length * lineHeight;
    const x = Phaser.Math.Clamp(pointer.worldX + 10, 10, this.worldWidth - width - 10);
    const y = Phaser.Math.Clamp(pointer.worldY + 10, 10, this.worldHeight - height - 10);
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, height, 0xf2e3c5, 0.95)
      .setOrigin(0);
    bg.setStrokeStyle(2, 0x8a6b44);
    container.add(bg);
    options.forEach((option, index) => {
      const text = this.add.text(
        padding,
        padding + index * lineHeight,
        option.label,
        {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "12px",
          color: option.value === this.editorPlacement ? "#6b2f26" : "#3b2a17",
        }
      );
      text.setInteractive({ useHandCursor: true });
      text.on("pointerdown", () => {
        this.editorPlacement = option.value;
        this.destroyEditorMenu();
      });
      container.add(text);
    });
    container.setDepth(200);
    this.editorMenu = { container, visible: true };
  }

  removeEditorItemAt(col, row) {
    const key = `${col},${row}`;
    const existing = this.blockMap.get(key);
    if (existing) {
      this.blockMap.delete(key);
      this.blocks.remove(existing, true, true);
      return;
    }
    const removeFromGroup = (group) => {
      if (!group?.getChildren) return false;
      const items = group.getChildren();
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (!item.active) continue;
        if (item.getData("col") === col && item.getData("row") === row) {
          group.remove(item, true, true);
          return true;
        }
      }
      return false;
    };
    if (removeFromGroup(this.coinsGroup)) return;
    if (removeFromGroup(this.heartsGroup)) return;
    if (removeFromGroup(this.chests)) return;
    if (removeFromGroup(this.molesGroup)) {
      this.moleAIs.forEach((_, mole) => {
        if (!mole.active) {
          this.moleAIs.delete(mole);
        }
      });
      return;
    }
    if (this.keyItem) {
      const keyPos = this.getKeyGridPos();
      if (keyPos && keyPos.col === col && keyPos.row === row) {
        this.keyItem.destroy();
        this.keyItem = null;
        this.disableKey = true;
      }
    }
    if (this.gate) {
      const gatePos = this.getGateGridPos();
      if (gatePos && gatePos.col === col && gatePos.row === row) {
        this.gate.destroy();
        this.gate = null;
        this.disableGate = true;
        this.gateTriggerTiles = new Set();
      }
    }
  }

  placeEditorBlock(pointer, type) {
    const col = Math.floor(pointer.worldX / this.tileSize);
    const row = Math.floor(pointer.worldY / this.tileSize);
    if (
      col <= 0 ||
      row <= 0 ||
      col >= (this.gridCols ?? 1) - 1 ||
      row >= (this.gridRows ?? 1) - 1
    ) {
      return;
    }
    const key = `${col},${row}`;
    if (this.blockMap.has(key)) return;
    this.placeBlock(col, row, type);
  }

  placeGateAt(col, row) {
    if (!this.tileSize) return;
    if (this.gate) {
      this.gate.destroy();
      this.gate = null;
    }
    this.disableGate = false;
    const gateX = (col + 0.5) * this.tileSize + this.gateOffsetX;
    const gateY = row * this.tileSize + this.gateOffsetY;
    this.gate = this.add.image(gateX, gateY, "underground-gate");
    this.gate.setOrigin(0.5, 1);
    this.gate.setScale(this.standScale);
    this.gate.setDepth(-1);
    this.setGateTriggerTiles();
  }

  removeEarthAt(col, row) {
    const block = this.blockMap.get(`${col},${row}`);
    if (!block || block.getData("type") !== "earth") return false;
    const bcol = block.getData("col");
    const brow = block.getData("row");
    this.blocks.remove(block, true, true);
    this.blockMap.delete(`${bcol},${brow}`);
    return true;
  }

  handleCoinTileHit(block) {
    if (!block || block.getData("type") !== "coin") return false;
    const hitsLeft = Math.max(1, block.getData("coinHits") ?? 3) - 1;
    block.setData("coinHits", hitsLeft);
    this.addCoins(10);
    if (this.sfx?.coin) {
      this.sfx.coin.play();
    }
    const coinFx = this.add.image(block.x + this.tileSize / 2, block.y, "ui-coin");
    coinFx.setScale(0.42);
    coinFx.setDepth(5);
    this.tweens.add({
      targets: coinFx,
      y: coinFx.y - 16,
      alpha: 0,
      duration: 200,
      onComplete: () => coinFx.destroy(),
    });
    if (hitsLeft <= 0) {
      block.setData("type", "stone");
      block.setTexture("underground-coin-used");
      if (block.refreshBody) {
        block.refreshBody();
      }
    }
    return true;
  }

  createMoleBar(mole) {
    const barBg = this.add.rectangle(mole.x, mole.y - 26, 26, this.moleBarHeight, 0x2f1e14);
    const barFill = this.add.rectangle(mole.x, mole.y - 26, 24, this.moleBarHeight - 2, 0xc23a2c);
    barBg.setOrigin(0.5);
    barFill.setOrigin(0.5);
    barBg.setDepth(4);
    barFill.setDepth(5);
    mole.setData("barBg", barBg);
    mole.setData("barFill", barFill);
    this.updateMoleBar(mole);
  }

  updateMoleBar(mole) {
    const barBg = mole.getData("barBg");
    const barFill = mole.getData("barFill");
    if (!barBg || !barFill) return;
    const maxHp = mole.getData("maxHp") || 3;
    const hp = mole.getData("hp") || 0;
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    barFill.displayWidth = Math.max(2, 24 * ratio);
  }

  updateMoleBarPosition(mole) {
    const barBg = mole.getData("barBg");
    const barFill = mole.getData("barFill");
    if (!barBg || !barFill) return;
    const y = mole.y - 26;
    barBg.setPosition(mole.x, y);
    barFill.setPosition(mole.x, y);
  }

  destroyMole(mole) {
    const barBg = mole.getData("barBg");
    const barFill = mole.getData("barFill");
    if (barBg) barBg.destroy();
    if (barFill) barFill.destroy();
    this.moleAIs.delete(mole);
    mole.destroy();
  }

  damageMole(mole, amount) {
    const currentHp = mole.getData("hp") ?? 0;
    const nextHp = Math.max(0, currentHp - amount);
    mole.setData("hp", nextHp);
    this.updateMoleBar(mole);
    if (nextHp <= 0) {
      this.destroyMole(mole);
    }
  }

  moleCanSeePlayer(mole) {
    if (!mole?.active || !this.player) return false;
    const moleRow = Math.floor((mole.y - 1) / this.tileSize);
    const playerRow = Math.floor((this.player.y - 1) / this.tileSize);
    if (moleRow !== playerRow) return false;
    const moleCol = Math.floor(mole.x / this.tileSize);
    const playerCol = Math.floor(this.player.x / this.tileSize);
    const start = Math.min(moleCol, playerCol) + 1;
    const end = Math.max(moleCol, playerCol) - 1;
    for (let col = start; col <= end; col += 1) {
      if (this.blockMap.has(`${col},${moleRow}`)) {
        return false;
      }
    }
    return true;
  }

  applyMoleAttack(mole) {
    const now = this.time.now;
    const nextAttackAt = mole.getData("nextAttackAt") || 0;
    if (now < nextAttackAt) return;
    mole.setData("nextAttackAt", now + 800);
    if (this.health <= 0) return;
    this.health = Math.max(0, this.health - 1);
    if (this.hud) {
      this.hud.setHealth(this.health, this.maxHealth);
    }
    this.saveInventory();
  }

  placeKeyAt(col, row) {
    if (!this.tileSize) return;
    if (this.keyItem) {
      this.keyItem.destroy();
      this.keyItem = null;
    }
    this.disableKey = false;
    const keyX = (col + 0.5) * this.tileSize + this.keyOffsetX;
    const keyY = (row + 1) * this.tileSize + this.keyOffsetY;
    this.keyItem = this.add.image(keyX, keyY, "ui-key");
    this.keyItem.setOrigin(0.5, 1);
    this.keyItem.setScale(0.55);
    this.keyItem.setDepth(2);
  }

  digBlock() {
    if (this.isPaused || this.isEditorMode) return;
    this.startSwing();
    const hitBounds = this.swordHitbox.getBounds();
    if (this.molesGroup?.getChildren) {
      const moles = this.molesGroup.getChildren();
      for (let i = 0; i < moles.length; i += 1) {
        const mole = moles[i];
        if (!mole.active) continue;
        if (!Phaser.Geom.Intersects.RectangleToRectangle(hitBounds, mole.getBounds())) continue;
        this.damageMole(mole, 1);
        return;
      }
    }
    if (this.chests?.children?.size) {
      const chestCandidates = this.chests.getChildren();
      for (let i = 0; i < chestCandidates.length; i += 1) {
        const chest = chestCandidates[i];
        if (!chest.active) continue;
        if (!Phaser.Geom.Intersects.RectangleToRectangle(hitBounds, chest.getBounds())) continue;
        this.openChest(chest);
        return;
      }
    }
    if (!this.blocks?.children?.size) return;
    const candidates = this.blocks.getChildren();
    let hitEarth = false;
    let hitBlocked = false;
    for (let i = 0; i < candidates.length; i += 1) {
      const block = candidates[i];
      if (!block.active) continue;
      if (!Phaser.Geom.Intersects.RectangleToRectangle(hitBounds, block.getBounds())) continue;
      const type = block.getData("type");
      if (type === "coin") {
        this.handleCoinTileHit(block);
        return;
      }
      if (type !== "earth") {
        hitBlocked = true;
        continue;
      }
      const col = block.getData("col");
      const row = block.getData("row");
      this.blocks.remove(block, true, true);
      this.blockMap.delete(`${col},${row}`);
      hitEarth = true;
      break;
    }
    if (hitEarth && this.sfx?.diggingEarth) {
      this.sfx.diggingEarth.play();
      return;
    }
    if (hitBlocked && this.sfx?.diggingFailed) {
      this.sfx.diggingFailed.play();
      return;
    }
    if (this.sfx?.swordSlash) {
      this.sfx.swordSlash.play();
    }
  }

  startSwing() {
    if (this.isSwinging) return;
    this.isSwinging = true;
    if (this.hud?.flashItem) {
      this.hud.flashItem("active");
    }
    const hitTexture = this.isDucking
      ? this.player.getData("crouchHitTexture")
      : this.player.getData("hitTexture");
    if (hitTexture) {
      this.player.setTexture(hitTexture);
    }
    this.updateSwordHitbox();
    if (this.debugHitboxes) {
      this.swordHitbox.setVisible(true);
    }
    if (this.swingTimer) {
      this.swingTimer.remove(false);
    }
    this.swingTimer = this.time.delayedCall(140, () => {
      const standingTexture = this.isDucking
        ? this.player.getData("crouchTexture")
        : this.player.getData("standingTexture");
      if (standingTexture) {
        this.player.setTexture(standingTexture);
      }
      if (!this.debugHitboxes) {
        this.swordHitbox.setVisible(false);
      }
      this.isSwinging = false;
    });
  }

  updateSwordHitbox() {
    if (!this.swordHitbox) return;
    const offsetX = this.facingX * 21;
    const baseCenterY = this.player.y - this.player.displayHeight * 0.6;
    let centerY = baseCenterY - 10;
    if (this.isDucking) {
      centerY = baseCenterY + 20;
      if (this.cursors.up.isDown || this.wasd.W.isDown) {
        centerY -= 10;
      }
    } else if (this.cursors.up.isDown || this.wasd.W.isDown) {
      centerY -= 10;
    }
    const hitboxYOffset = this.isDucking ? 12 : 3;
    this.swordHitbox.setPosition(this.player.x + offsetX, centerY + hitboxYOffset);
  }

  performDownStrike() {
    if (this.isPaused || this.isEditorMode) return;
    this.startSwing();
    this.digBlockBelow();
  }

  digBlockBelow() {
    if (!this.tileSize || !this.blockMap) {
      if (this.sfx?.swordSlash) {
        this.sfx.swordSlash.play();
      }
      return;
    }
    const col = Math.floor(this.player.x / this.tileSize);
    const row = Math.floor((this.player.y - 1) / this.tileSize);
    const block = this.blockMap.get(`${col},${row}`);
    if (!block || !block.active) {
      if (this.sfx?.swordSlash) {
        this.sfx.swordSlash.play();
      }
      return;
    }
    const type = block.getData("type");
    if (type === "coin") {
      this.handleCoinTileHit(block);
      return;
    }
    if (type === "earth") {
      this.blocks.remove(block, true, true);
      this.blockMap.delete(`${col},${row}`);
      if (this.sfx?.diggingEarth) {
        this.sfx.diggingEarth.play();
      }
      return;
    }
    if (this.sfx?.diggingFailed) {
      this.sfx.diggingFailed.play();
    }
  }

  handleCoinPickup(player, coin) {
    if (!coin?.active) return;
    this.coinsGroup.remove(coin, true, true);
    this.addCoins(1);
    if (this.sfx?.coin) {
      this.sfx.coin.play();
    }
  }

  handleHeartPickup(player, heart) {
    if (!heart?.active) return;
    if (this.health >= this.maxHealth) return;
    this.heartsGroup.remove(heart, true, true);
    this.health = Math.min(this.maxHealth, this.health + 1);
    if (this.hud) {
      this.hud.setHealth(this.health, this.maxHealth);
    }
    this.saveInventory();
  }

  openChest(chest) {
    if (!chest.active || chest.getData("opened")) return;
    chest.setData("opened", true);
    const chestId = chest.getData("id");
    if (this.sfx?.chestHit) {
      this.sfx.chestHit.play();
    }
    this.addCoins(this.coinsPerChest);
    if (this.sfx?.coin) {
      this.sfx.coin.play();
    }
    chest.setTexture("chest-opened");
    const coin = this.add.circle(chest.x, chest.y - 8, 6, 0xf5d37a);
    this.tweens.add({
      targets: coin,
      y: coin.y - 20,
      alpha: 0,
      duration: 450,
      onComplete: () => coin.destroy(),
    });
    // Keep opened chest visible for future visits.
    if (chestId) {
      const saveData = this.registry.get("saveData") || {};
      const nextSave = {
        ...saveData,
        undergroundDigChests: {
          ...(saveData.undergroundDigChests || {}),
          [chestId]: true,
        },
      };
      this.registry.set("saveData", nextSave);
      saveProgress(nextSave);
    }
  }

  addCoins(amount) {
    this.coinsCollected += amount;
    if (this.hud) {
      this.hud.setCoins(this.coinsCollected);
    }
    this.saveInventory();
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
      equipment: {
        ...saveData.equipment,
      },
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);
  }

  createUI() {
    const saveData = this.registry.get("saveData") || {};
    this.health = saveData.health ?? this.maxHealth;
    this.coinsCollected = saveData.coins ?? 0;
    this.consumables = { ...(saveData.consumables || {}) };
    this.keyCollected = Boolean(saveData.undergroundKeyCollected || this.keyCollected);
    this.hasShoes = Boolean(saveData.equipment?.shoes);
    this.hud = new TopHud(this, {
      coins: this.coinsCollected,
      health: this.health,
      maxHealth: this.maxHealth,
      consumables: this.consumables,
      passiveOwned: saveData.equipment?.shield ?? false,
      passiveShoes: saveData.equipment?.shoes ?? false,
      activeDisabled: false,
      showCompanion: true,
      companionHealth: 1,
      companionRespawnRatio: 0,
      keyCollected: this.keyCollected,
    });
    this.hud.setDepth(200);

    this.hintText = this.add
      .text(14, 585, "Pfeile/A/D = Bewegen, W/Oben = Springen, Leertaste = Graben, Esc = Menu", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0, 1)
      .setStroke("#3b2a17", 2);
    this.hintText.setDepth(60);

    this.locationText = this.add
      .text(940, 585, this.locationName, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(1, 1)
      .setStroke("#3b2a17", 2);
    this.locationText.setDepth(60);

    this.promptBox = this.add.container(0, 0).setDepth(20).setVisible(false);
    const promptShade = this.add.rectangle(480, 300, 960, 600, 0x2c2216, 0.65);
    const promptPanel = this.add
      .rectangle(480, 300, 520, 180, 0xe2c18b)
      .setStrokeStyle(3, 0x8a6b44);
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
    this.hud.setScrollFactor(0);
    this.hintText.setScrollFactor(0);
    this.locationText.setScrollFactor(0);
    this.promptBox.setScrollFactor(0);
  }

  createAudio() {
    this.sfx = {
      swordSlash: this.sound.add("sfx-sword-slash"),
      diggingEarth: this.sound.add("sfx-digging-earth"),
      diggingFailed: this.sound.add("sfx-digging-failed"),
      jump: this.sound.add("sfx-jump"),
      companionHop: this.sound.add("sfx-jump", { volume: 0.3 }),
      levitating: this.sound.add("sfx-levitating", { loop: true, volume: 1 }),
      chestHit: this.sound.add("sfx-chest-hit"),
      coin: this.sound.add("sfx-coin"),
      keyOpen: this.sound.add("sfx-key-open"),
    };
  }

  update() {
    if (this.isPaused || this.isEditorMode || this.isHitboxEditMode) {
      this.player.body.setVelocity(0, 0);
      if (this.companion?.body) {
        this.companion.body.setVelocity(0, 0);
      }
      return;
    }
    const grounded = this.player.body.blocked.down;
    if (grounded && !this.wasGrounded) {
      this.jumpCount = 0;
    }
    this.wasGrounded = grounded;
    const speed = 180;
    const now = this.time.now;
    this.updateDashState(now);
    let vx = 0;
    if (this.dashLocked) {
      vx = 0;
    } else if (this.dashActive) {
      vx = this.dashDir * speed * this.dashSpeedMultiplier;
    } else {
      if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= speed;
      if (this.cursors.right.isDown || this.wasd.D.isDown) vx += speed;
    }
    if (vx !== 0) {
      this.facingX = vx > 0 ? 1 : -1;
      this.player.setFlipX(vx > 0);
    }
    this.player.body.setVelocityX(vx);

    const duckPressed = this.cursors.down.isDown || this.wasd.S.isDown;
    const downJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.S);
    if (downJustPressed) {
      const now = this.time.now;
      if (this.lastDownPressAt && now - this.lastDownPressAt < 280) {
        this.lastDownPressAt = 0;
        this.performDownStrike();
      } else {
        this.lastDownPressAt = now;
      }
    }
    if (duckPressed && !this.isDucking) {
      const feetY = this.getPlayerFeetY();
      this.isDucking = true;
      this.player.setScale(this.duckScale, this.duckScale);
      this.applyPlayerBody(this.duckBodyHeight);
      this.setPlayerFeetY(feetY);
      const crouchTexture = this.player.getData("crouchTexture");
      if (crouchTexture && !this.isSwinging) {
        this.player.setTexture(crouchTexture);
      }
    } else if (!duckPressed && this.isDucking) {
      if (this.canStandUp()) {
        const feetY = this.getPlayerFeetY();
        this.isDucking = false;
        this.player.setScale(this.standScale, this.standScale);
        this.applyPlayerBody(this.standBodyHeight);
        this.setPlayerFeetY(feetY);
        const standingTexture = this.player.getData("standingTexture");
        if (standingTexture && !this.isSwinging) {
          this.player.setTexture(standingTexture);
        }
      }
    }

    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.W);
    if (jumpPressed && !this.isDucking) {
      let didJump = false;
      if (grounded) {
        this.player.body.setVelocityY(-390);
        this.jumpCount = 1;
        didJump = true;
      } else if (this.jumpCount === 1) {
        this.player.body.setVelocityY(-390);
        this.jumpCount = 2;
        didJump = true;
      }
      if (didJump && this.sfx?.jump) {
        this.sfx.jump.play();
      }
    }
    if (this.isSwinging) {
      this.updateSwordHitbox();
    }
    this.checkDashBlocked();
    this.checkDashMoleHit();
    this.updateCameraScroll();
    this.updateMoles();
    this.updateCompanion();
    this.checkKeyPickup();
    this.checkGateUnlock();
  }

  updateMoles() {
    if (!this.molesGroup?.getChildren || !this.molesGroup.children) return;
    const now = this.time.now;
    const delta = this.game?.loop?.delta ?? 16;
    this.molesGroup.getChildren().forEach((mole) => {
      if (!mole.active) return;
      const ai = this.moleAIs.get(mole);
      if (!ai) return;
      ai.update(now, delta);
      this.updateMoleBarPosition(mole);
    });
  }

  updateDashState(now) {
    if (!this.hasShoes) {
      this.dashActive = false;
      return;
    }
    const grounded = Boolean(this.player?.body?.blocked?.down);
    if (this.dashLocked) {
      const holding =
        this.cursors.left.isDown ||
        this.wasd.A.isDown ||
        this.cursors.right.isDown ||
        this.wasd.D.isDown;
      if (!holding) {
        this.dashLocked = false;
      }
      this.dashActive = false;
      return;
    }
    const checkTap = (key, name, dir) => {
      if (!Phaser.Input.Keyboard.JustDown(key)) return;
      const last = this.dashLastTap[name] || 0;
      if (now - last <= this.dashTapWindow) {
        if (grounded) {
          this.dashActive = true;
          this.dashDir = dir;
        } else {
          this.dashLastTap[name] = now;
        }
      } else {
        this.dashLastTap[name] = now;
      }
    };
    checkTap(this.cursors.left, "left", -1);
    checkTap(this.cursors.right, "right", 1);
    checkTap(this.wasd.A, "left", -1);
    checkTap(this.wasd.D, "right", 1);
    if (this.dashActive) {
      const keyDown =
        (this.dashDir < 0 && (this.cursors.left.isDown || this.wasd.A.isDown)) ||
        (this.dashDir > 0 && (this.cursors.right.isDown || this.wasd.D.isDown));
      if (!keyDown) {
        this.dashActive = false;
      }
    }
    if (this.hud?.setShoesActive) {
      this.hud.setShoesActive(this.dashActive);
    }
  }

  checkDashBlocked() {
    if (!this.dashActive || !this.player?.body) return;
    if (this.player.body.blocked.left || this.player.body.blocked.right) {
      this.tryDashBreakBlock();
      this.applyDashBounce();
    }
  }

  tryDashBreakBlock() {
    if (!this.blocks?.children?.size || !this.blockMap || !this.player?.body || !this.tileSize) {
      return false;
    }
    const body = this.player.body;
    const frontX = this.dashDir < 0 ? body.x - 1 : body.x + body.width;
    const col = Math.floor(frontX / this.tileSize);
    const rowStart = Math.floor(body.y / this.tileSize);
    const rowEnd = Math.floor((body.y + body.height - 1) / this.tileSize);
    if (this.showDashDebug) {
      if (!this.dashDebugGraphics) {
        this.dashDebugGraphics = this.add.graphics();
        this.dashDebugGraphics.setDepth(200);
      }
      this.dashDebugGraphics.clear();
      this.dashDebugGraphics.lineStyle(2, 0x00e5ff, 0.9);
      this.dashDebugGraphics.strokeRect(
        col * this.tileSize,
        rowStart * this.tileSize,
        this.tileSize,
        (rowEnd - rowStart + 1) * this.tileSize
      );
    }
    let destroyed = 0;
    for (let row = rowStart; row <= rowEnd; row += 1) {
      const block = this.blockMap.get(`${col},${row}`);
      if (!block || !block.active) continue;
      const type = block.getData("type");
      if (type === "coin") {
        if (this.handleCoinTileHit(block)) {
          destroyed += 1;
        }
        continue;
      }
      if (type !== "earth") continue;
      this.blocks.remove(block, true, true);
      this.blockMap.delete(`${col},${row}`);
      destroyed += 1;
    }
    if (destroyed > 0 && this.sfx?.diggingEarth) {
      this.sfx.diggingEarth.play();
    }
    return destroyed > 0;
  }

  checkDashMoleHit() {
    if (!this.dashActive || !this.molesGroup?.getChildren) return;
    const hitBounds = this.player.getBounds();
    const moles = this.molesGroup.getChildren();
    for (let i = 0; i < moles.length; i += 1) {
      const mole = moles[i];
      if (!mole.active) continue;
      if (!Phaser.Geom.Intersects.RectangleToRectangle(hitBounds, mole.getBounds())) continue;
      this.damageMole(mole, 2);
      this.tryDashBreakBlock();
      this.applyDashBounce();
      return;
    }
  }

  applyDashBounce() {
    this.player.x -= this.dashDir * this.dashBounceDistance;
    this.dashActive = false;
    this.dashLocked = true;
    if (this.player?.body) {
      this.player.body.setVelocityX(0);
    }
  }

  updateCameraScroll() {
    if (!this.scrollXEnabled) return;
    const camera = this.cameras.main;
    if (!camera) return;
    const margin = this.tileSize * 10;
    const viewLeft = camera.scrollX;
    const viewRight = viewLeft + camera.width;
    if (this.worldWidth <= camera.width) {
      camera.scrollX = 0;
      return;
    }
    if (this.player.x < viewLeft + margin) {
      camera.scrollX = Phaser.Math.Clamp(
        this.player.x - margin,
        0,
        this.worldWidth - camera.width
      );
    } else if (this.player.x > viewRight - margin) {
      camera.scrollX = Phaser.Math.Clamp(
        this.player.x + margin - camera.width,
        0,
        this.worldWidth - camera.width
      );
    }
  }

  updateCompanion() {
    if (!this.companion?.body || !this.tileSize) return;
    const targetTile = this.getCompanionTargetTile();
    if (!targetTile) return;
    const currentTile = this.getCompanionTilePosition();
    const atTarget =
      currentTile &&
      currentTile.col === targetTile.col &&
      currentTile.row === targetTile.row &&
      this.companion.body.blocked.down;
    const targetPos = {
      x: (targetTile.col + 0.5) * this.tileSize,
      y: (targetTile.row + 1) * this.tileSize,
    };
    // Debug visuals disabled.
    if (this.companionMode === "fly") {
      this.updateCompanionFly(targetPos);
      return;
    }
    if (atTarget) {
      this.setCompanionIdle();
      return;
    }
    this.updateCompanionHop(targetPos);
  }

  startCompanionClimb() {
    if (!this.companion?.body) return;
    this.companionClimbing = true;
    this.companion.body.setAllowGravity(false);
    this.companion.body.setVelocityX(0);
    this.companion.body.setVelocityY(-30);
  }

  stopCompanionClimb() {
    if (!this.companion?.body) return;
    this.companionClimbing = false;
    this.companion.body.setAllowGravity(true);
  }

  getCompanionTargetTile() {
    if (!this.tileSize) return null;
    const playerCol = Math.floor(this.player.x / this.tileSize);
    const playerFeetY = this.player?.y ?? this.getPlayerFeetY();
    const playerRow = Math.floor((playerFeetY - 1) / this.tileSize) - 1;
    const left = { col: playerCol - 1, row: playerRow };
    const right = { col: playerCol + 1, row: playerRow };
    const isStandable = (candidate) => {
      if (
        candidate.col < 0 ||
        candidate.row < 0 ||
        candidate.col >= (this.gridCols ?? 1) ||
        candidate.row >= (this.gridRows ?? 1)
      ) {
        return false;
      }
      if (this.blockMap.has(`${candidate.col},${candidate.row}`)) return false;
      if (candidate.row + 1 >= (this.gridRows ?? 1)) return false;
      return this.blockMap.has(`${candidate.col},${candidate.row + 1}`);
    };
    const standableCandidates = [left, right].filter(isStandable);
    if (standableCandidates.length) {
      if (standableCandidates.length === 1) return standableCandidates[0];
      const leftCenter = (left.col + 0.5) * this.tileSize;
      const rightCenter = (right.col + 0.5) * this.tileSize;
      const leftDistance = Math.abs(this.companion.x - leftCenter);
      const rightDistance = Math.abs(this.companion.x - rightCenter);
      return leftDistance <= rightDistance ? left : right;
    }
    return { col: playerCol, row: playerRow };
  }

  getCompanionTilePosition() {
    const col = Math.floor(this.companion.x / this.tileSize);
    const feetY = this.companion?.y ?? this.companion?.body?.bottom ?? 0;
    const row = Math.floor((feetY - 1) / this.tileSize);
    return { col, row };
  }


  setCompanionIdle() {
    if (!this.companion?.body) return;
    this.companion.body.setVelocity(0, 0);
    this.companion.setTexture("companion-searching");
    this.updateCompanionShield(false);
    this.companionFarSince = 0;
    if (this.sfx?.levitating?.isPlaying) {
      this.sfx.levitating.stop();
    }
  }

  updateCompanionHop(targetPos) {
    if (!this.companion?.body) return;
    const now = this.time.now;
    const dx = targetPos.x - this.companion.x;
    const dy = targetPos.y - this.companion.y;
    const distance = Math.hypot(dx, dy);
    const distanceTiles = distance / this.tileSize;
    if (distanceTiles > 3) {
      if (!this.companionFarSince) {
        this.companionFarSince = now;
      } else if (now - this.companionFarSince > 1000) {
        this.startCompanionFly(targetPos);
        return;
      }
    } else {
      this.companionFarSince = 0;
    }
    if (distance < this.tileSize * 0.2 && this.companion.body.blocked.down) {
      this.setCompanionIdle();
      return;
    }
    this.companionLastDistance = distance;
    const speed = 160;
    if (Math.abs(dx) > 2) {
      this.companion.body.setVelocityX(Math.sign(dx) * speed);
      this.companion.setFlipX(dx < 0);
    } else {
      this.companion.body.setVelocityX(0);
    }
    if (this.companion.body.blocked.down && now - this.companionLastHop > 420) {
      this.companion.body.setVelocityY(-160);
      this.companionLastHop = now;
      if (this.sfx?.companionHop) {
        this.sfx.companionHop.play();
      }
    }
    this.companion.setTexture("companion-running");
    this.updateCompanionShield(false);
  }

  startCompanionFly(targetPos) {
    if (!this.companion?.body) return;
    this.companionMode = "fly";
    this.companionFlyBase = { x: this.companion.x, y: this.companion.y };
    this.companion.body.setAllowGravity(false);
    this.companion.body.setVelocity(0, 0);
    this.companion.body.setEnable(false);
    this.updateCompanionShield(true);
    if (this.sfx?.levitating && !this.sfx.levitating.isPlaying) {
      this.sfx.levitating.play();
    }
    this.companionLastDistance = null;
    this.companionLastProgressAt = this.time.now;
    this.updateCompanionFly(targetPos);
  }

  updateCompanionFly(targetPos) {
    if (!this.companion || !this.companionFlyBase) return;
    const delta = Math.min(0.05, (this.game?.loop?.delta ?? 16) / 1000);
    const dx = targetPos.x - this.companionFlyBase.x;
    const dy = targetPos.y - this.companionFlyBase.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 2) {
      this.finishCompanionFly(targetPos);
      return;
    }
    const speed = 168;
    const step = Math.min(distance, speed * delta);
    const nx = dx / (distance || 1);
    const ny = dy / (distance || 1);
    this.companionFlyBase.x += nx * step;
    this.companionFlyBase.y += ny * step;
    const sway = Math.sin(this.time.now / 220) * 10;
    this.companion.setPosition(this.companionFlyBase.x + sway, this.companionFlyBase.y);
    this.updateCompanionShield(true);
  }

  finishCompanionFly(targetPos) {
    if (!this.companion?.body) return;
    this.companionMode = "hop";
    this.companionFlyBase = null;
    this.companion.setPosition(targetPos.x, targetPos.y);
    this.companion.body.setEnable(true);
    this.companion.body.setAllowGravity(true);
    this.companion.body.reset(this.companion.x, this.companion.y);
    this.companionLastDistance = null;
    this.companionLastProgressAt = this.time.now;
    this.companionFarSince = 0;
    this.updateCompanionShield(false);
    if (this.sfx?.levitating?.isPlaying) {
      this.sfx.levitating.stop();
    }
  }

  updateCompanionShield(visible) {
    if (!this.companionShield || !this.companion) return;
    this.companionShield.setVisible(visible);
    if (visible) {
      this.companionShield.setPosition(this.companion.x, this.companion.y - 14);
    }
  }

  drawCompanionDebug(targetTile, hasPlan) {
    // Debug visuals disabled.
  }

  checkKeyPickup() {
    if (this.disableKey) return;
    if (this.keyCollected || !this.keyItem || !this.player?.body) return;
    const playerRect = new Phaser.Geom.Rectangle(
      this.player.body.x,
      this.player.body.y,
      this.player.body.width,
      this.player.body.height
    );
    const keyRect = this.keyItem.getBounds();
    if (!Phaser.Geom.Intersects.RectangleToRectangle(playerRect, keyRect)) return;
    this.keyCollected = true;
    this.keyItem.destroy();
    this.keyItem = null;
    if (this.hud && typeof this.hud.setKeyCollected === "function") {
      this.hud.setKeyCollected(true);
    }
    const saveData = this.registry.get("saveData") || {};
    const nextSave = {
      ...saveData,
      undergroundKeyCollected: true,
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);
  }

  checkGateUnlock() {
    if (this.disableGate) return;
    if (!this.keyCollected || this.levelCompleted || !this.player?.body) return;
    const playerRect = new Phaser.Geom.Rectangle(
      this.player.body.x,
      this.player.body.y,
      this.player.body.width,
      this.player.body.height
    );
    let onTrigger = false;
    this.gateTriggerTiles?.forEach((key) => {
      if (onTrigger) return;
      const [colStr, rowStr] = key.split(",");
      const col = Number(colStr);
      const row = Number(rowStr);
      if (Number.isNaN(col) || Number.isNaN(row)) return;
      const tileRect = new Phaser.Geom.Rectangle(
        col * this.tileSize,
        row * this.tileSize,
        this.tileSize,
        this.tileSize
      );
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerRect, tileRect)) {
        onTrigger = true;
      }
    });
    if (!onTrigger) return;
    this.winLevel();
  }

  winLevel() {
    this.levelCompleted = true;
    this.isPaused = true;
    this.player.body.setVelocity(0, 0);
    this.time.paused = true;
    this.physics.world.pause();
    this.promptBox.setVisible(true);
    if (this.sfx?.keyOpen) {
      this.sfx.keyOpen.play();
    }
    this.promptText.setText("Du hast das Tor geoeffnet!");
    this.promptHint.setText("Enter zur Karte");

    this.input.keyboard.once("keydown-ENTER", () => {
      const saveData = this.registry.get("saveData") || {};
      const completed = new Set(saveData.completedLevels || []);
      completed.add("UnderDig");
      const nextSave = {
        ...saveData,
        completedLevels: Array.from(completed),
        currentLevel: "UnderShop",
        undergroundKeyCollected: this.keyCollected,
      };
      this.registry.set("saveData", nextSave);
      saveProgress(nextSave);
      this.time.paused = false;
      this.scene.start("UndergroundMapScene");
    });
  }

  canStandUp() {
    if (!this.tileSize || !this.blockMap || !this.player?.body) return true;
    const standRect = this.getStandHitboxRect();
    if (!standRect) return true;
    const leftCol = Math.floor(standRect.x / this.tileSize);
    const rightCol = Math.floor((standRect.x + standRect.width - 1) / this.tileSize);
    const topRow = Math.floor(standRect.y / this.tileSize);
    const bottomRow = Math.floor((standRect.y + standRect.height - 1) / this.tileSize);
    for (let row = topRow; row <= bottomRow; row += 1) {
      for (let col = leftCol; col <= rightCol; col += 1) {
        const block = this.blockMap.get(`${col},${row}`);
        if (block && Phaser.Geom.Intersects.RectangleToRectangle(standRect, block.getBounds())) {
          return false;
        }
      }
    }
    return true;
  }

  openExitPrompt() {
    if (this.isPaused) return;
    this.isPaused = true;
    this.player.body.setVelocity(0, 0);
    this.time.paused = true;
    this.physics.world.pause();
    this.promptBox.setVisible(true);
    this.promptText.setText("Willst du das Level wirklich verlassen?");
    this.promptHint.setText("[J]a oder [N]ein");

    const closePrompt = (resumeWorld) => {
      this.input.keyboard.off("keydown-J", onYes);
      this.input.keyboard.off("keydown-N", onNo);
      this.promptBox.setVisible(false);
      if (resumeWorld) {
        this.isPaused = false;
        this.time.paused = false;
        this.physics.world.resume();
      }
    };

    const onYes = () => {
      closePrompt(false);
      this.time.paused = false;
      this.scene.start("UndergroundMapScene");
    };
    const onNo = () => closePrompt(true);

    this.input.keyboard.once("keydown-J", onYes);
    this.input.keyboard.once("keydown-N", onNo);
  }

  useConsumable() {
    if (!this.hud) return;
    const result = this.hud.tryUseHoney({
      count: this.consumables?.honey ?? 0,
      health: this.health,
      maxHealth: this.maxHealth,
      companionHealth: 1,
      companionRespawnAt: 0,
    });
    if (!result.consumed) return;
    this.health = result.health;
    this.consumables.honey = result.count;
    const saveData = this.registry.get("saveData") || {};
    const nextSave = {
      ...saveData,
      health: this.health,
      consumables: {
        ...saveData.consumables,
        honey: this.consumables.honey,
      },
    };
    this.registry.set("saveData", nextSave);
    saveProgress(nextSave);
  }

  toggleFullscreen() {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    } else {
      this.scale.startFullscreen();
    }
  }
}
