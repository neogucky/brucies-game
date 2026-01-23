import { saveProgress } from "../../saveManager.js";
import { playMusic } from "../../soundManager.js";
import TopHud from "../../ui/topHud.js";
import CoordinateDebugger from "../../utils/coordinateDebugger.js";

export default class UndergroundDigScene extends Phaser.Scene {
  constructor() {
    super({ key: "UndergroundDigScene" });
    this.blockMap = new Map();
    this.isPaused = false;
    this.isEditorMode = false;
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
  }

  create() {
    this.resetSceneState();
    this.addBackground();
    this.createPlayer();
    this.loadLevelMap();
    this.createBlocks();
    this.createCompanion();
    this.createUI();
    this.createAudio();
    playMusic(this, "music-world");
    this.ensureSaveState();

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
    if (this.chests) {
      this.chests.clear(true, true);
      this.chests = null;
    }
    if (this.companionDebugGraphics) {
      this.companionDebugGraphics.destroy();
      this.companionDebugGraphics = null;
    }
    if (this.companionShield) {
      this.companionShield.destroy();
      this.companionShield = null;
    }
    if (this.physics?.world?.isPaused) {
      this.physics.world.resume();
    }
    if (this.time?.paused) {
      this.time.paused = false;
    }
  }

  ensureSaveState() {
    const saveData = this.registry.get("saveData") || {};
    if (saveData.currentLevel !== "UnderDig") {
      const nextSave = {
        ...saveData,
        currentLevel: "UnderDig",
      };
      this.registry.set("saveData", nextSave);
      saveProgress(nextSave);
    }
  }

  loadLevelMap() {
    const cached = this.cache.json?.get("underground-dig-map");
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
    const bg = this.add.image(480, 300, "underground-bg");
    const scale = Math.max(960 / bg.width, 600 / bg.height);
    bg.setScale(scale);
    bg.setDepth(-2);
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
    this.physics.world.setBounds(0, 0, 960, 600);
    this.physics.world.gravity.y = 900;

    this.swordHitbox = this.add.rectangle(-100, -100, 47, 32, 0xff0000, 0.15);
    this.swordHitbox.setStrokeStyle(2, 0xff0000);
    this.swordHitbox.setVisible(false);
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
    this.createBlockTextures();
    this.blocks = this.physics.add.staticGroup();
    this.blockMap.clear();

    const cols = Math.ceil(960 / this.tileSize);
    const rows = Math.ceil(600 / this.tileSize);
    this.gridCols = cols;
    this.gridRows = rows;
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
    this.placeGate();
    this.placeKey();
    this.placeChests();
    this.setGateTriggerTiles();
    this.physics.add.collider(this.player, this.blocks);
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
    this.physics.add.collider(this.companion, this.blocks);
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
      { col: chest1Col, row: chest1Row },
      { col: chest2Col, row: chest2Row },
    ];
    spots.forEach((spot) => {
      const chest = this.add.image(
        (spot.col + 0.5) * this.tileSize,
        (spot.row + 1) * this.tileSize + 20,
        "chest-closed"
      );
      chest.setScale(0.45);
      chest.setDepth(2);
      chest.setData("opened", false);
      this.physics.add.existing(chest, true);
      this.chests.add(chest);
    });
  }

  setGateTriggerTiles() {
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
      block.x = Phaser.Math.Clamp(dragX, 0, 960);
      block.y = Phaser.Math.Clamp(dragY, 0, 600);
      return;
    }
    if (block === this.keyItem) {
      block.x = Phaser.Math.Clamp(dragX, 0, 960);
      block.y = Phaser.Math.Clamp(dragY, 0, 600);
      return;
    }
    if (!block.getData) return;
    if (block.getData("type") === "black") return;
    const col = Phaser.Math.Clamp(
      Math.floor(dragX / this.tileSize),
      0,
      Math.floor(960 / this.tileSize)
    );
    const row = Phaser.Math.Clamp(
      Math.floor(dragY / this.tileSize),
      0,
      Math.floor(600 / this.tileSize)
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
    const payload = {
      tileSize: this.tileSize,
      start: { col: this.startCol ?? 0, row: this.startRow ?? 0 },
      gate: this.getGateGridPos(),
      key: this.getKeyGridPos(),
      blocks,
    };
    console.log("UndergroundDigMap:", JSON.stringify(payload));
  }

  handlePointerDown(pointer) {
    if (!this.isEditorMode) return;
    const col = Math.floor(pointer.worldX / this.tileSize);
    const row = Math.floor(pointer.worldY / this.tileSize);
    const key = `${col},${row}`;
    const existing = this.blockMap.get(key);
    if (pointer.rightButtonDown()) {
      if (!existing) return;
      this.blockMap.delete(key);
      this.blocks.remove(existing, true, true);
      return;
    }
    if (existing) {
      const current = existing.getData("type");
      if (current === "earth") {
        this.placeBlock(col, row, "stone", true);
      } else if (current === "stone") {
        this.placeBlock(col, row, "black", true);
      }
      return;
    }
    this.placeEditorBlock(pointer, "earth");
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

  digBlock() {
    if (this.isPaused || this.isEditorMode) return;
    this.startSwing();
    const hitBounds = this.swordHitbox.getBounds();
    if (this.chests) {
      const chestCandidates = this.chests.getChildren();
      for (let i = 0; i < chestCandidates.length; i += 1) {
        const chest = chestCandidates[i];
        if (!chest.active) continue;
        if (!Phaser.Geom.Intersects.RectangleToRectangle(hitBounds, chest.getBounds())) continue;
        this.openChest(chest);
        return;
      }
    }
    const candidates = this.blocks.getChildren();
    let hitEarth = false;
    let hitBlocked = false;
    for (let i = 0; i < candidates.length; i += 1) {
      const block = candidates[i];
      if (!block.active) continue;
      if (!Phaser.Geom.Intersects.RectangleToRectangle(hitBounds, block.getBounds())) continue;
      const type = block.getData("type");
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
    const hitTexture = this.isDucking
      ? this.player.getData("crouchHitTexture")
      : this.player.getData("hitTexture");
    if (hitTexture) {
      this.player.setTexture(hitTexture);
    }
    this.updateSwordHitbox();
    this.swordHitbox.setVisible(false);
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
      this.swordHitbox.setVisible(false);
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
    }
    const hitboxYOffset = this.isDucking ? 12 : 3;
    this.swordHitbox.setPosition(this.player.x + offsetX, centerY + hitboxYOffset);
  }

  openChest(chest) {
    if (!chest.active || chest.getData("opened")) return;
    chest.setData("opened", true);
    if (this.sfx?.chestHit) {
      this.sfx.chestHit.play();
    }
    this.addCoins(this.coinsPerChest);
    if (this.sfx?.coin) {
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
    this.hud = new TopHud(this, {
      coins: this.coinsCollected,
      health: this.health,
      maxHealth: this.maxHealth,
      consumables: this.consumables,
      passiveOwned: saveData.equipment?.shield ?? false,
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
      .text(940, 585, "Untergrundpfad", {
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
    const speed = 180;
    let vx = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= speed;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += speed;
    if (vx !== 0) {
      this.facingX = vx > 0 ? 1 : -1;
      this.player.setFlipX(vx > 0);
    }
    this.player.body.setVelocityX(vx);

    const duckPressed = this.cursors.down.isDown || this.wasd.S.isDown;
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

    const jumpPressed = this.cursors.up.isDown || this.wasd.W.isDown;
    if (jumpPressed && !this.isDucking && this.player.body.blocked.down) {
      this.player.body.setVelocityY(-390);
      if (this.sfx?.jump) {
        this.sfx.jump.play();
      }
    }
    if (this.isSwinging) {
      this.updateSwordHitbox();
    }
    this.updateCompanion();
    this.checkKeyPickup();
    this.checkGateUnlock();
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
    if (distanceTiles > 2) {
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
  }

  checkGateUnlock() {
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
