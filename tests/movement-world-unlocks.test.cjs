const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { EventEmitter } = require('node:events');
const root = path.join(__dirname, '..');
function load(ctx, file, name) {
  let code = fs.readFileSync(path.join(root, file), 'utf8').replace(/^import[\s\S]*?;\n/gm, '');
  if (name) code = code.replace(/export default class \w+/, `globalThis.${name} = class ${name}`);
  vm.runInContext(code.replace(/export /g, ''), ctx);
}
const ctx = vm.createContext({ Phaser: { Scene: class {} }, performance: { now: () => 100 } });
load(ctx, 'src/utils/controlProfiles.js'); load(ctx, 'src/utils/PortableControls.js', 'PortableControls');
load(ctx, 'src/utils/inventory.js'); load(ctx, 'src/saveManager.js'); load(ctx, 'src/utils/worldMapRoutes.js');
load(ctx, 'src/scenes/DessertMapScene.js', 'DessertMapScene');
const event = code => ({ code, preventDefault() {}, stopImmediatePropagation() {} });
for (const profile of ['pc', 'ipadKeyboard']) for (const [letter, arrow, direction] of [
  ['KeyW', 'ArrowUp', 'up'], ['KeyA', 'ArrowLeft', 'left'], ['KeyS', 'ArrowDown', 'down'], ['KeyD', 'ArrowRight', 'right'],
]) test(`${profile}: ${letter} + ${arrow} stay held until both physical keys are released`, () => {
  for (const order of [[letter, arrow], [arrow, letter]]) {
    const calls = [], key = { onDown() { calls.push('down'); }, onUp() { calls.push('up'); } };
    const scene = { input: { keyboard: new EventEmitter() }, cursors: { [direction]: key } };
    const controls = Object.create(ctx.PortableControls.prototype);
    controls.activeScene = () => scene; controls.getProfile = () => profile; controls.held = new Set();
    controls.onKey(event(order[0]), true); controls.onKey(event(order[1]), true);
    controls.onKey({ ...event(order[0]), repeat: true }, true);
    assert.deepEqual(calls, ['down']);
    controls.onKey(event(order[0]), false); assert.deepEqual(calls, ['down']); assert.ok(controls.held.has(direction));
    controls.onKey(event(order[1]), false); assert.deepEqual(calls, ['down', 'up']); assert.equal(controls.held.size, 0);
  }
});
test('focus loss clears physical aliases as well as held actions before the next press', () => {
  const controls = Object.create(ctx.PortableControls.prototype), scene = {};
  controls.activeScene = () => scene; controls.held = new Set(['up']); controls.heldKeys = new Map([['KeyW', 'up'], ['ArrowUp', 'up']]);
  controls.autoPause(); assert.equal(controls.held.size, 0); assert.equal(controls.heldKeys.size, 0);
});
test('touch profile still uses its direction buttons and ignores both physical movement layouts', () => {
  for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']) {
    assert.equal(ctx.actionForKey(event(code), 'ipadTouch'), null);
  }
});
for (const world of ['desert', 'underground', 'jungle']) test(`preview ${world}: every real world, place and key gate opens without completing levels`, () => {
  const before = { currentLevel: 'Wuestenruine', currentWorld: 'desert', unlockedLevels: ['Wuestenruine'],
    completedLevels: [], coins: 173, inventory: { weapons: { hammer: true } }, mapState: { [world + 'Node']: world === 'desert' ? 'Taverne' : world === 'underground' ? 'UnderDig' : 'Lianenpfad' } };
  const original = JSON.stringify(before), save = ctx.unlockAllForTesting(before, world);
  assert.equal(save.currentWorld, world); assert.equal(save.currentLevel, before.mapState[world + 'Node']);
  for (const target of ['desert', 'underground', 'jungle']) assert.ok(ctx.isWorldUnlocked(save, target));
  const all = vm.runInContext('Object.values(WORLD_LEVELS).flat()', ctx);
  for (const level of all) assert.ok(save.unlockedLevels.includes(level));
  assert.equal(save.undergroundKeyCollected, true); assert.equal(save.health, 5); assert.equal(save.coins, 173);
  assert.equal(save.completedLevels.length, 0); assert.equal(save.inventory.weapons.hammer, true); assert.equal(JSON.stringify(before), original);
});
function desert(save) {
  const scene = Object.create(ctx.DessertMapScene.prototype), routes = [], targets = [];
  Object.assign(scene, { registry: { get: () => save, set(_key, value) { save = value; } },
    unlocked: new Set(save.unlockedLevels || ['Fremdweg']), currentNode: { id: 'Fremdweg', x: 720, y: 460 },
    lockText: { setText(value) { scene.hint = value; } }, time: { delayedCall() {} },
    mapTravel: { travel(from, to, done) { routes.push([from.id, to.id]); done(); } },
    scene: { start(...args) { targets.push(args); } } });
  ctx.drawWorldMapPaths = (_scene, world, nodes, exits) => ({ world, exits }); ctx.saveProgress = () => {};
  return { scene, routes, targets, save: () => save };
}
test('preview desert draws and traverses the same underground exit even before Fremdweg is completed', () => {
  const fixture = desert(ctx.unlockAllForTesting({ completedLevels: [], mapState: { desertNode: 'Fremdweg' } }, 'desert'));
  fixture.scene.drawPaths(); assert.equal(fixture.scene.pathGraphics.exits.length, 1);
  fixture.scene.travelToUnderground(); assert.deepEqual(fixture.routes, [['Fremdweg', '@underground']]);
  assert.equal(fixture.targets[0][0], 'UndergroundMapScene'); assert.equal(fixture.save().mapState.undergroundNode, 'UnderShop');
  assert.equal(fixture.save().completedLevels.length, 0);
});
test('a normal new game keeps the underground exit closed; old completed saves still open it', () => {
  const closed = desert({ currentLevel: 'Fremdweg', unlockedWorlds: ['desert'], unlockedLevels: ['Fremdweg'], completedLevels: [] });
  closed.scene.drawPaths(); assert.equal(closed.scene.pathGraphics.exits.length, 0);
  closed.scene.travelToUnderground(); assert.equal(closed.routes.length, 0); assert.match(closed.scene.hint, /versperrt/);
  const legacy = desert({ currentLevel: 'Fremdweg', unlockedLevels: ['Fremdweg'], completedLevels: ['Fremdweg'] });
  legacy.scene.drawPaths(); assert.equal(legacy.scene.pathGraphics.exits.length, 1); legacy.scene.travelToUnderground();
  assert.equal(legacy.targets[0][0], 'UndergroundMapScene');
});
