const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');

function loadScene(name, file = 'scenes/desert/' + name + '.js') {
  let saved = { health: 5, coins: 123 };
  const context = {
    Phaser: { Scene: class {}, Math: {
      FloatBetween: () => 0, Clamp: (n, lo, hi) => Math.max(lo, Math.min(n, hi)),
      Distance: { Between: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay) },
    } },
    saveProgress(data) { saved = data; }, playMusic() {},
  };
  vm.createContext(context);
  const load = (file, name) => {
    let code = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8')
      .replace(/^import .*;\n/gm, '');
    code = name ? code.replace('export default class ' + name, 'globalThis.' + name + ' = class ' + name)
      : code.replace(/export /g, '');
    vm.runInContext(code, context);
  };
  load('utils/inventory.js'); load('utils/ShieldManager.js', 'ShieldManager');
  const saveCode = fs.readFileSync(path.join(__dirname, '../src/saveManager.js'), 'utf8')
    .replace(/^import .*;\n/gm, '').replace(/export /g, '');
  context.normalizeWorldProgress = vm.runInNewContext(saveCode + '\nnormalizeWorldProgress;');
  load(file, name);
  const scene = new context[name]();
  const actor = (data = {}) => ({
    active: true, x: 400, y: 300, displayWidth: 60, displayHeight: 60,
    body: { width: 30, setVelocity() {}, setSize() {} },
    getData(key) { return data[key]; }, setData(key, value) { data[key] = value; return this; },
    setTexture() { return this; }, setFlipX() { return this; },
  });
  const graphic = () => {
    const item = {};
    for (const key of ['setDepth', 'setOrigin', 'setStroke', 'setScale', 'setVisible', 'setText', 'setAlpha']) {
      item[key] = () => item;
    }
    return item;
  };
  const timers = [];
  const keyboard = new EventEmitter();
  scene.registry = { get: () => saved, set: (_, data) => { saved = data; } };
  scene.time = { now: 1000, paused: false, delayedCall(delay, callback) {
    const timer = { at: scene.time.now + delay, callback, removed: false, remove() { this.removed = true; } };
    timers.push(timer); return timer;
  } };
  scene.input = { keyboard };
  scene.physics = { world: { pause() {}, resume() {} } };
  scene.add = { image: graphic, text: graphic, rectangle: graphic };
  scene.player = actor(); scene.companion = actor();
  scene.inventory = { consumables: { honey: 5 } };
  scene.equipped = { weapon: 'sword', passive: null, companion: 'default', consumable: 'honey' };
  scene.consumables = { honey: 5 };
  scene.coinsCollected = 123;
  scene.stopAllSounds = scene.stopEndlessTimers = scene.fitScreenImage =
    scene.updateMonsterBar = scene.flashEntity = scene.shakeCameraBurst = () => {};
  scene.getMonsterTarget = () => scene.player;
  return {
    scene, context, actor, keyboard, timers,
    getSaved: () => saved,
    advance(now) {
      scene.time.now = now;
      for (const timer of timers) {
        if (!timer.removed && timer.at <= now) { timer.removed = true; timer.callback(); }
      }
    },
  };
}

for (const name of ['DesertRuinScene', 'DesertEndlessScene', 'DesertTunnelScene']) {
  test(name + ': returning to the map after defeat saves full hearts and retains gold/items', () => {
    const { scene, keyboard, getSaved } = loadScene(name);
    scene.health = 0; scene.companionHealth = 0; scene.companionRespawnAt = 5000;
    let destination;
    scene.scene = { start(key) { destination = key; } };
    scene.gameOver(); keyboard.emit('keydown-ESC');
    assert.equal(scene.health, 5);
    assert.equal(scene.companionHealth, 1);
    assert.equal(scene.companionRespawnAt, 0);
    assert.equal(getSaved().health, 5);
    assert.equal(getSaved().coins, 123);
    assert.equal(getSaved().inventory.consumables.honey, 5);
    assert.equal(destination, 'DessertMapScene');
  });

  test(name + ': scene reuse clears attack, inventory, exit prompt, and skipped-save flags', () => {
    const { scene } = loadScene(name);
    scene.isSwinging = scene.inventoryOpen = scene.isPromptActive = scene.skipShutdownSave = true;
    scene.time.paused = true;
    scene.resetState();
    assert.equal(scene.isSwinging, false);
    assert.equal(scene.inventoryOpen, false);
    assert.equal(scene.isPromptActive, false);
    assert.equal(scene.skipShutdownSave, false);
    assert.equal(scene.time.paused, false);
  });

  test(name + ': a stunned enemy cannot attack, but can attack after recovery', () => {
    const { scene, actor } = loadScene(name);
    const monster = actor({ stunnedUntil: 1500 });
    let attacks = 0;
    scene.damagePlayer = () => { attacks += 1; };
    scene.setMonsterAttack = () => {};
    scene.attemptMonsterAttack(monster, scene.player);
    assert.equal(attacks, 0);
    assert.equal(monster.getData('nextAttackAt'), undefined);
    scene.time.now = 1500;
    scene.attemptMonsterAttack(monster, scene.player);
    assert.equal(attacks, 1);
  });

  for (const flag of ['isGameOver', 'isPaused', 'isComplete']) {
    test(name + ': ' + flag + ' prevents healing-item waste and late damage', () => {
      const { scene } = loadScene(name);
      scene[flag] = true;
      let healingAttempts = 0, shieldAttempts = 0;
      scene.hud = { tryUseHoney() { healingAttempts += 1; } };
      scene.shield = { tryBlockHit() { shieldAttempts += 1; } };
      scene.useConsumable(); scene.damagePlayer(1);
      assert.equal(healingAttempts, 0);
      assert.equal(shieldAttempts, 0);
      assert.equal(scene.health, 5);
    });
  }
}

for (const name of ['DesertEndlessScene', 'DesertTunnelScene']) {
  test(name + ': hitting a charging boss cancels its pending attack', () => {
    const { scene, actor, advance } = loadScene(name);
    const boss = actor({ type: 'boss', hp: 10 });
    let attacks = 0;
    scene.executeMonsterAttack = () => { attacks += 1; };
    scene.setBossAttack(boss, scene.player);
    const pendingAttack = boss.getData('bossAttackEvent');
    scene.time.now = 1050; scene.damageMonster(boss, 1);
    assert.equal(boss.getData('isWindingUp'), false);
    assert.equal(pendingAttack.removed, true);
    assert.equal(boss.getData('hp'), 9);
    advance(1500);
    assert.equal(attacks, 0);
  });

  test(name + ': uninterrupted boss windup still delivers its attack', () => {
    const { scene, actor, advance } = loadScene(name);
    const boss = actor({ type: 'boss', hp: 10 });
    let damage = 0;
    scene.damagePlayer = amount => { damage += amount; };
    scene.setBossAttack(boss, scene.player); advance(1500);
    assert.equal(damage, 2);
  });
}

for (const name of ['DessertMapScene', 'UndergroundMapScene']) {
  test(name + ': Enter cannot start a level during travel or inventory selection', () => {
    const { scene } = loadScene(name, 'scenes/' + name + '.js');
    scene.currentNode = { id: name === 'DessertMapScene' ? 'Taverne' : 'UnderShop' };
    scene.unlocked = new Set([scene.currentNode.id]);
    const starts = [];
    scene.scene = { start(key) { starts.push(key); } };
    scene.isMoving = true; scene.startCurrentLevel();
    scene.isMoving = false; scene.inventoryOpen = true; scene.startCurrentLevel();
    assert.equal(starts.length, 0);
    scene.inventoryOpen = false; scene.startCurrentLevel();
    assert.equal(starts.length, 1);
  });
}

test('underground world transition cannot be retriggered or started from inventory/dialog', () => {
  const { scene } = loadScene('UndergroundMapScene', 'scenes/UndergroundMapScene.js');
  scene.currentNode = { id: 'UnderShop', x: 445, y: 210 };
  const moves = [];
  scene.tweens = { add(config) { moves.push(config); } };
  scene.inventoryOpen = true; scene.returnToDesert();
  scene.inventoryOpen = false; scene.isDialogOpen = true; scene.returnToDesert();
  assert.equal(moves.length, 0);
  scene.isDialogOpen = false; scene.returnToDesert(); scene.returnToDesert();
  assert.equal(moves.length, 1);
  assert.equal(scene.isMoving, true);
});

test('main menu returns with exactly three current menu entries', () => {
  const { scene } = loadScene('MainMenuScene', 'scenes/MainMenuScene.js');
  scene.addBackground = scene.addTitle = scene.createConfirmDialog = scene.createSettingsDialog =
    scene.updateSelection = () => {};
  scene.addMenu = () => scene.menuItems.push({ id: 1 }, { id: 2 }, { id: 3 });
  for (let visit = 0; visit < 4; visit += 1) {
    scene.create();
    assert.equal(scene.menuItems.length, 3);
  }
});

test('explicit empty equipment slots survive normalization; legacy equipment still migrates', () => {
  const { context } = loadScene('MainMenuScene', 'scenes/MainMenuScene.js');
  const inventory = { passives: { shield: true }, consumables: { honey: 4 } };
  const normalized = context.normalizeInventory({
    inventory, equipment: { shield: true },
    equipped: { weapon: null, passive: null, consumable: null, companion: null },
  });
  assert.equal(normalized.equipped.weapon, null);
  assert.equal(normalized.equipped.passive, null);
  assert.equal(normalized.equipped.consumable, null);
  assert.equal(normalized.equipped.companion, null);
  const legacy = context.normalizeInventory({ equipment: { shield: true }, consumables: { honey: 4 } });
  assert.equal(legacy.equipped.passive, 'shield');
  assert.equal(legacy.equipped.consumable, 'honey');
});

test('real save loader migrates old shield/honey saves without overriding explicit empty slots', () => {
  const { context } = loadScene('MainMenuScene', 'scenes/MainMenuScene.js');
  let stored;
  context.localStorage = { getItem: () => stored };
  const code = fs.readFileSync(path.join(__dirname, '../src/saveManager.js'), 'utf8')
    .replace(/^import .*;\n/gm, '').replace(/export /g, '');
  vm.runInContext(code + '\nglobalThis.load = loadSave;', context);
  stored = JSON.stringify({ equipment: { shield: true }, consumables: { honey: 2 } });
  assert.equal(context.load().equipped.passive, 'shield');
  assert.equal(context.load().equipped.consumable, 'honey');
  stored = JSON.stringify({ equipment: { shield: true }, consumables: { honey: 2 }, equipped: { passive: null, consumable: null } });
  assert.equal(context.load().equipped.passive, null);
  assert.equal(context.load().equipped.consumable, null);
});

test('reequipping a shield cannot bypass its existing cooldown', () => {
  const { scene, context } = loadScene('MainMenuScene', 'scenes/MainMenuScene.js');
  const shield = new context.ShieldManager(scene);
  const equipped = { equipment: { shield: true } }, unequipped = { equipment: { shield: false } };
  shield.initFromSave(equipped); shield.tryBlockHit();
  const readyAt = shield.cooldownUntil;
  scene.time.now = 2000;
  shield.initFromSave(equipped, { resetCooldown: false });
  assert.equal(shield.active, false);
  shield.initFromSave(unequipped, { resetCooldown: false });
  shield.initFromSave(equipped, { resetCooldown: false });
  assert.equal(shield.active, false);
  assert.equal(shield.cooldownUntil, readyAt);
  scene.time.now = readyAt;
  shield.initFromSave(equipped, { resetCooldown: false });
  assert.equal(shield.active, true);
  assert.equal(shield.cooldownUntil, 0);
});

test('Kristalltiefen unlocks after the guardian and is reachable from the gate', () => {
  const { scene, context, getSaved } = loadScene('UndergroundMapScene', 'scenes/UndergroundMapScene.js');
  scene.ensureUnlocks();
  assert.equal(getSaved().unlockedLevels.includes('Kristalltiefen'), false);
  getSaved().completedLevels = ['Schluesselweg'];
  scene.ensureUnlocks();
  assert.equal(getSaved().unlockedLevels.includes('Kristalltiefen'), true);
  scene.currentNode = vm.runInContext('NODES.find(n => n.id === "Schluesseltor")', context);
  assert.equal(scene.getNeighborForDirection({ x: 0, y: 1 }), 'Kristalltiefen');
  scene.currentNode = vm.runInContext('NODES.find(n => n.id === "Kristalltiefen")', context);
  scene.unlocked = new Set(getSaved().unlockedLevels);
  let target, data;
  scene.scene = { start(key, options) { target = key; data = options; } };
  scene.startCurrentLevel();
  assert.equal(target, 'UndergroundDigScene');
  assert.equal(data.mapKey, 'underground-crystal-map');
  assert.equal(data.levelId, 'Kristalltiefen');
});

test('continue-game returns Kristalltiefen saves to the underground map', () => {
  const { scene, getSaved } = loadScene('MainMenuScene', 'scenes/MainMenuScene.js');
  getSaved().currentLevel = 'Kristalltiefen';
  let target;
  scene.scene = { start(key) { target = key; } };
  scene.loadGame();
  assert.equal(target, 'UndergroundMapScene');
});
