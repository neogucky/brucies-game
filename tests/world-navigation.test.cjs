const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.join(__dirname, '../src');
const strip = text => text.replace(/^import .*;\n/gm, '').replace(/export /g, '');
const saveCode = strip(fs.readFileSync(path.join(root, 'saveManager.js'), 'utf8'));
const normalize = vm.runInNewContext(saveCode + '\nnormalizeWorldProgress;');
const plain = value => JSON.parse(JSON.stringify(value));
function fixture(name, file, save = {}) {
  let stored = save;
  const starts = [], tweens = [], hints = [];
  const context = { Phaser: { Scene: class {} }, normalizeWorldProgress: normalize,
    saveProgress: data => { stored = data; } };
  vm.createContext(context);
  const code = fs.readFileSync(path.join(root, file), 'utf8').replace(/^import .*;\n/gm, '')
    .replace('export default class ' + name, 'globalThis.Scene = class ' + name).replace(/export /g, '');
  vm.runInContext(code, context);
  const scene = new context.Scene();
  scene.registry = { get: () => stored, set: (_, data) => { stored = data; } };
  scene.scene = { start: (key, data) => starts.push({ key, data }) };
  scene.tweens = { add: config => { tweens.push(config); } };
  scene.playerMarker = { x: 220, y: 366 };
  scene.companionMarker = { x: 200, y: 377, visible: false };
  scene.lockText = { setText: text => hints.push(text) };
  scene.time = { delayedCall() { return { remove() {} }; } };
  return { scene, context, starts, tweens, hints, saved: () => stored };
}
const jungleFixture = save => fixture('JungleMapScene', 'scenes/jungle/JungleMapScene.js', save);
const underFixture = save => fixture('UndergroundMapScene', 'scenes/UndergroundMapScene.js', save);

test('legacy Urwald world marker becomes world progress and returns to the final real underground level', () => {
  const original = { currentLevel: 'Urwald', unlockedLevels: ['UnderShop', 'Urwald'], coins: 393, health: 3,
    inventory: { passives: { bow: true } }, completedLevels: ['Schluesselweg', 'Kristalltiefen'],
    mapState: { undergroundNode: 'Urwald', jungleNode: 'Lianenpfad' } };
  const save = normalize(original);
  assert.equal(save.currentWorld, 'jungle'); assert.equal(save.currentLevel, 'Lianenpfad');
  assert.equal(save.mapState.undergroundNode, 'Kristalltiefen');
  assert.equal(save.unlockedLevels.includes('Urwald'), false);
  assert.equal(save.unlockedWorlds.includes('jungle'), true);
  assert.equal(save.coins, 393); assert.equal(save.health, 3);
  assert.deepEqual(plain(save.inventory), original.inventory);
  assert.deepEqual(original.unlockedLevels, ['UnderShop', 'Urwald']);
});
test('a world unlock grants its entry shop and first level, without unlocking the second level', () => {
  const save = normalize({ unlockedLevels: ['Urwald'] });
  assert.ok(save.unlockedLevels.includes('UrwaldShop')); assert.ok(save.unlockedLevels.includes('Urwaldkronen'));
  assert.equal(save.unlockedLevels.includes('Lianenpfad'), false);
});
test('loading old jungle level or shop saves infers the world and preserves the selected place', () => {
  for (const level of ['UrwaldShop', 'Urwaldkronen', 'Lianenpfad']) {
    const save = normalize({ currentLevel: level, mapState: { jungleNode: level } });
    assert.equal(save.currentWorld, 'jungle'); assert.ok(save.unlockedWorlds.includes('jungle'));
    assert.ok(save.unlockedLevels.includes('UrwaldShop')); assert.equal(save.currentLevel, level);
    assert.equal(save.mapState.jungleNode, level);
  }
});
test('unrelated saves do not unlock the jungle early', () => {
  const save = normalize({ currentLevel: 'Schluesselweg', completedLevels: ['Fremdweg'] });
  assert.equal(save.currentWorld, 'underground'); assert.equal(save.unlockedWorlds.includes('jungle'), false);
});
test('the crystal boss completion unlocks the world and the monkey king unlocks the next level', () => {
  const save = normalize({ currentLevel: 'Kristalltiefen', completedLevels: ['Kristalltiefen', 'Urwaldkronen'] });
  assert.ok(save.unlockedWorlds.includes('jungle')); assert.ok(save.unlockedLevels.includes('Lianenpfad'));
  assert.equal(save.currentWorld, 'underground');
});
test('normalizing a current save is repeatable without changing equipment or progress', () => {
  const save = normalize({ currentLevel: 'UrwaldShop', unlockedWorlds: ['jungle'],
    inventory: { weapons: { powerHammer: true } }, equipped: { weapon: 'powerHammer', passive: 'bow' } });
  assert.deepEqual(plain(normalize(save)), plain(save));
});
test('underground contains only real levels and places, with no Urwald pseudo level', () => {
  const { context } = underFixture();
  assert.equal(vm.runInContext('NODES.some(n => n.id === "Urwald")', context), false);
  assert.equal(vm.runInContext('Object.values(NODES.find(n => n.id === "Kristalltiefen").neighbors).includes("Urwald")', context), false);
});
test('entering Kristalltiefen still starts its playable level rather than switching worlds', () => {
  const { scene, starts } = underFixture({ currentLevel: 'Kristalltiefen' });
  scene.currentNode = { id: 'Kristalltiefen' }; scene.unlocked = new Set(['Kristalltiefen']);
  scene.startCurrentLevel();
  assert.equal(starts[0].key, 'UndergroundDigScene'); assert.equal(starts[0].data.levelId, 'Kristalltiefen');
});
test('the world boundary stays locked until the jungle is unlocked', () => {
  const { scene, tweens, hints, starts } = underFixture({ currentLevel: 'Kristalltiefen' });
  scene.currentNode = { id: 'Kristalltiefen', x: 690, y: 450 }; scene.travelToJungle();
  assert.equal(tweens.length, 0); assert.equal(starts.length, 0); assert.match(hints[0], /Obsidian-Titan/);
});
test('the unlocked world boundary travels directly between world maps and stores each map position separately', () => {
  const { scene, tweens, starts, saved } = underFixture({ currentLevel: 'Kristalltiefen', unlockedLevels: ['Urwald'], coins: 393 });
  scene.currentNode = { id: 'Kristalltiefen', x: 690, y: 450 }; scene.travelToJungle();
  assert.equal(scene.isMoving, true); assert.equal(starts.length, 0);
  assert.equal(saved().currentWorld, 'jungle'); assert.equal(saved().currentLevel, 'UrwaldShop');
  assert.equal(saved().mapState.undergroundNode, 'Kristalltiefen'); assert.equal(saved().mapState.jungleNode, 'UrwaldShop');
  assert.equal(saved().coins, 393); tweens[0].onComplete();
  assert.equal(starts[0].key, 'JungleMapScene'); assert.equal(starts[0].data.fromUnderworld, true);
});
test('travel is blocked while moving, showing the inventory, or a dialog', () => {
  for (const flag of ['isMoving', 'inventoryOpen', 'isDialogOpen']) {
    const { scene, tweens } = underFixture({ unlockedWorlds: ['jungle'] });
    scene.currentNode = { id: 'Kristalltiefen' }; scene[flag] = true; scene.travelToJungle();
    assert.equal(tweens.length, 0);
  }
});
test('jungle map places use the same walking/entering model as the other world maps', () => {
  const { scene, context, starts, tweens } = jungleFixture();
  const nodes = vm.runInContext('JUNGLE_NODES', context);
  scene.currentNode = nodes[0]; scene.unlocked = new Set(nodes.map(n => n.id));
  let saves = 0; scene.saveLocation = () => { saves++; };
  scene.tryMove({ x: 1, y: 0 });
  assert.equal(scene.isMoving, true); assert.equal(starts.length, 0);
  scene.startCurrentLevel(); assert.equal(starts.length, 0);
  tweens[0].onComplete(); assert.equal(scene.currentNode.id, 'Urwaldkronen'); assert.equal(saves, 1);
  scene.startCurrentLevel(); assert.equal(starts[0].key, 'JungleScene'); assert.equal(starts[0].data.levelId, 'Urwaldkronen');
});
test('the jungle shop enters its shop scene and never starts a combat level', () => {
  const { scene, starts } = jungleFixture(); scene.currentNode = { id: 'UrwaldShop' };
  scene.unlocked = new Set(['UrwaldShop']); scene.saveLocation = () => {};
  scene.startCurrentLevel(); assert.equal(starts[0].key, 'JungleShopScene');
});
test('a locked next jungle level cannot be walked to or entered', () => {
  const { scene, context, starts, tweens, hints } = jungleFixture();
  const nodes = vm.runInContext('JUNGLE_NODES', context);
  scene.currentNode = nodes[1]; scene.unlocked = new Set(['UrwaldShop', 'Urwaldkronen']);
  scene.tryMove({ x: 1, y: 0 }); assert.equal(tweens.length, 0); assert.match(hints[0], /Affenkönig/);
  scene.currentNode = nodes[2]; scene.startCurrentLevel(); assert.equal(starts.length, 0);
});
test('returning from the jungle entry reaches Kristalltiefen on the underground world map', () => {
  const { scene, tweens, starts, saved } = jungleFixture({ coins: 393, mapState: { jungleNode: 'UrwaldShop' } });
  scene.currentNode = { id: 'UrwaldShop', y: 360 }; scene.returnToUnderworld();
  assert.equal(saved().currentLevel, 'Kristalltiefen'); assert.equal(saved().currentWorld, 'underground');
  assert.equal(saved().mapState.undergroundNode, 'Kristalltiefen'); assert.equal(saved().coins, 393);
  tweens[0].onComplete(); assert.equal(starts[0].key, 'UndergroundMapScene'); assert.equal(starts[0].data.fromJungle, true);
});
test('the jungle return route is only at the entry shop, not on every level', () => {
  const { scene, tweens } = jungleFixture(); scene.currentNode = { id: 'Lianenpfad' };
  scene.returnToUnderworld(); assert.equal(tweens.length, 0);
});

test('Phaser retaining old start data cannot reset the jungle position when returning from a level', () => {
  const { scene } = jungleFixture(), data = { fromUnderworld: true };
  scene.init(data); assert.equal(scene.entryFromUnderworld, true);
  scene.init(data); assert.equal(scene.entryFromUnderworld, false);
});

test('return animations on the underground map are also consumed on the first visit', () => {
  const { scene } = underFixture(), data = { fromJungle: true };
  scene.init(data); assert.equal(scene.entryFromJungle, true);
  scene.init(data); assert.equal(scene.entryFromJungle, false);
});
