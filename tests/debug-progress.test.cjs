const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { EventEmitter } = require('node:events');
const source = file => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
const strip = code => code.replace(/^import .*;\n/gm, '').replace(/export /g, '');
let stored;
const context = vm.createContext({ normalizeInventory: save => save,
  localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; } } });
vm.runInContext(strip(source('saveManager.js')) + '\nglobalThis.saveApi = { defaultSave, WORLD_LEVELS, SECRET_LEVELS, editDebugProgress, debugLevelUnlocks, normalizeWorldProgress, unlockAllForTesting, loadSave, saveProgress };', context);
vm.runInContext(strip(source('utils/bonusChallenges.js')) + '\nglobalThis.bonusApi = { BONUS_CHALLENGES, bonusState, unlockBonus, beginBonus };', context);
const api = context.saveApi, bonus = context.bonusApi;
const plain = value => JSON.parse(JSON.stringify(value));
const fresh = () => structuredClone(plain(api.defaultSave));
const preview = () => api.unlockAllForTesting({ ...fresh(), coins: 319, completedLevels: ['Urwaldkronen', 'Lianenpfad', 'Kristalltiefen', 'Fremdweg'] }, 'jungle');

test('debug bonus IDs match the actual secret levels in every world', () => {
  for (const [world, id] of Object.entries(api.SECRET_LEVELS)) assert.equal(bonus.BONUS_CHALLENGES[world].id, id);
});

for (const world of Object.keys(api.WORLD_LEVELS)) {
  test(world + ': a world lock survives normalization, unlockAll and a saved-game reload', () => {
    const before = preview(), next = api.editDebugProgress(before, { worlds: { [world]: false } });
    assert.ok(!next.unlockedWorlds.includes(world));
    assert.ok(!api.normalizeWorldProgress(next).unlockedWorlds.includes(world));
    assert.ok(!api.unlockAllForTesting(next, world).unlockedWorlds.includes(world));
    api.saveProgress(next);
    assert.ok(!api.loadSave().unlockedWorlds.includes(world));
    assert.ok(api.editDebugProgress(next, { worlds: { [world]: true } }).unlockedWorlds.includes(world));
    assert.equal(next.coins, before.coins);
    assert.deepEqual(plain(next.completedLevels), plain(before.completedLevels));
    assert.deepEqual(plain(next.inventory), plain(before.inventory));
  });
}

for (const id of ['Wuestenexperte', 'Wuestenruine', 'UnderShop', 'Unterweltexperte', 'Urwaldkronen', 'UrwaldShop', 'Lianenpfad', 'Seeufer']) {
  test(id + ': a level can remain locked even when earlier progress normally grants it', () => {
    const save = { ...preview(), expertIntroductions: { desert: true } };
    const next = api.editDebugProgress(save, { levels: { [id]: false } });
    assert.ok(!next.unlockedLevels.includes(id)); assert.notEqual(next.currentLevel, id);
    api.saveProgress(next); assert.ok(!api.loadSave().unlockedLevels.includes(id));
    assert.ok(!api.unlockAllForTesting(next).unlockedLevels.includes(id));
    assert.ok(api.editDebugProgress(next, { levels: { [id]: true } }).unlockedLevels.includes(id));
  });
}

for (const [world, id] of Object.entries(api.SECRET_LEVELS)) {
  test(world + ': resetting a used secret erases its complete attempt and allows the real lever to unlock a fresh attempt', () => {
    const before = { ...preview(), currentLevel: id, completedLevels: [id, 'Fremdweg'],
      bonusChallenges: { [world]: { status: 'complete', remainingMs: 0, elapsedMs: 41000, recordMs: 41000,
        allCollected: true, collected: ['g:0', 's1:0'], x: 260, y: 710 }, other: { status: 'running' } },
      mapReveals: { [world]: { nodes: [id, 'other'], paths: [id + '/other', 'other/else'] } } };
    const original = JSON.stringify(before);
    const reset = api.editDebugProgress(before, { switches: { [world]: false } });
    assert.ok(!reset.unlockedLevels.includes(id)); assert.ok(!reset.completedLevels.includes(id));
    assert.equal(reset.bonusChallenges[world], undefined); assert.notEqual(reset.currentLevel, id);
    assert.deepEqual(plain(reset.bonusChallenges.other), { status: 'running' });
    assert.equal(bonus.bonusState(reset, world).status, 'locked');
    assert.ok(!reset.mapReveals[world].nodes.includes(id));
    assert.deepEqual(plain(reset.mapReveals[world].paths), ['other/else']);
    assert.equal(reset.coins, 319); assert.equal(JSON.stringify(before), original);
    api.saveProgress(reset);
    const reloaded = api.unlockAllForTesting(api.loadSave(), world);
    assert.equal(bonus.bonusState(reloaded, world).status, 'locked');
    assert.ok(!reloaded.unlockedLevels.includes(id));
    const pulled = api.normalizeWorldProgress(bonus.unlockBonus(reloaded, world));
    assert.ok(pulled.unlockedLevels.includes(id));
    const attempt = bonus.bonusState(bonus.beginBonus(pulled, world), world);
    assert.equal(attempt.status, 'running'); assert.equal(attempt.remainingMs, 60000);
    assert.deepEqual(plain(attempt.collected), []); assert.equal(attempt.recordMs, undefined); assert.equal(attempt.x, undefined);
  });

  test(world + ': unlocking a switch does not discard a played attempt; off then on explicitly resets it', () => {
    const save = { ...preview(), completedLevels: [id], bonusChallenges: { [world]: { status: 'complete', recordMs: 19000 } } };
    const kept = api.editDebugProgress(save, { switches: { [world]: true } });
    assert.equal(bonus.bonusState(kept, world).status, 'complete');
    const reset = api.editDebugProgress(api.editDebugProgress(kept, { switches: { [world]: false } }), { switches: { [world]: true } });
    assert.equal(bonus.bonusState(reset, world).status, 'ready');
    assert.equal(bonus.bonusState(reset, world).recordMs, undefined);
    assert.ok(!reset.completedLevels.includes(id));
  });
}

test('locking all worlds yields no resumable location; re-enabling a world repairs the location without changing inventory', () => {
  const save = preview(), worlds = Object.fromEntries(Object.keys(api.WORLD_LEVELS).map(world => [world, false]));
  const locked = api.editDebugProgress(save, { worlds });
  assert.equal(locked.currentLevel, null); assert.equal(locked.currentWorld, null);
  api.saveProgress(locked); assert.equal(api.loadSave().currentLevel, null);
  const open = api.editDebugProgress(locked, { worlds: { jungle: true } });
  assert.equal(open.currentWorld, 'jungle'); assert.ok(open.unlockedLevels.includes(open.currentLevel));
  assert.deepEqual(plain(open.inventory), plain(save.inventory));
});

test('locking every world disables Continue but still treats the save as existing before starting a new game', () => {
  const save = api.editDebugProgress({ ...preview(), lastPlayed: '2026-10-27T12:00:00Z' }, {
    worlds: Object.fromEntries(Object.keys(api.WORLD_LEVELS).map(world => [world, false])) });
  const ctx = vm.createContext({ Phaser: { Scene: class {} }, normalizeWorldProgress: api.normalizeWorldProgress, playMusic() {} });
  vm.runInContext(source('scenes/MainMenuScene.js').replace(/^import .*;\n/gm, '')
    .replace('export default class MainMenuScene', 'globalThis.Menu = class MainMenuScene'), ctx);
  const menu = new ctx.Menu(); menu.registry = { get: () => save }; menu.input = { keyboard: new EventEmitter() };
  for (const method of ['addBackground', 'addTitle', 'addMenu', 'createSettingsDialog', 'updateSelection']) menu[method] = () => {};
  menu.create(); assert.equal(menu.hasSave, true); assert.equal(menu.canContinue, false);
  let confirmed = 0; menu.openConfirmDialog = () => confirmed++;
  menu.startNewGame = () => assert.fail('A locked save must not be silently erased');
  menu.requestNewGame(menu.hasSave); assert.equal(confirmed, 1);
});

test('manual locks clear revealed routes and unlocking does not falsely mark their reveal as seen', () => {
  const save = { ...preview(), mapReveals: {
    desert: { nodes: ['Wuestenexperte', 'Wuestenruine', '@underground'], paths: ['Wuestenexperte/Wuestenruine', '@underground/Fremdweg'] },
    underground: { nodes: ['UnderShop', 'UnderDig'], paths: ['UnderDig/UnderShop'] } } };
  const next = api.editDebugProgress(save, { levels: { Wuestenruine: false }, worlds: { underground: false } });
  assert.deepEqual(plain(next.mapReveals.desert.nodes), ['Wuestenexperte']);
  assert.deepEqual(plain(next.mapReveals.desert.paths), []);
  assert.deepEqual(plain(next.mapReveals.underground.nodes), []);
  assert.equal(api.editDebugProgress(next, { levels: { Wuestenruine: true } }).mapReveals.desert.nodes.includes('Wuestenruine'), false);
});

test('changing unrelated debug settings preserves the water shore walking position and a valid resume level', () => {
  const before = { ...preview(), currentWorld: 'water', currentLevel: 'Seeufer', mapState: { waterNode: 'Wasserkante' } };
  const next = api.editDebugProgress(before, { levels: { Wuestenruine: false } });
  assert.equal(next.mapState.waterNode, 'Wasserkante'); assert.equal(next.currentLevel, 'Seeufer');
  const closed = api.editDebugProgress(next, { worlds: Object.fromEntries(Object.keys(api.WORLD_LEVELS).map(world => [world, false])) });
  const open = api.editDebugProgress(closed, { worlds: { water: true } });
  assert.equal(open.currentWorld, 'water'); assert.equal(open.currentLevel, 'Seeufer');
});

for (const [name, id] of [['DessertMapScene', 'Wuestenexperte'], ['UndergroundMapScene', 'UnderShop']]) {
  test(name + ': entering the world map cannot re-add a manually locked starting place', () => {
    const ctx = vm.createContext({ Phaser: { Scene: class {} }, normalizeWorldProgress: api.normalizeWorldProgress, saveProgress() {} });
    vm.runInContext(source('scenes/' + name + '.js').replace(/^import .*;\n/gm, '')
      .replace('export default class ' + name, 'globalThis.MapScene = class ' + name), ctx);
    let save = api.editDebugProgress(preview(), { levels: { [id]: false } });
    const scene = new ctx.MapScene(); scene.registry = { get: () => save, set: (_, value) => { save = value; } };
    scene.ensureUnlocks(); assert.ok(!save.unlockedLevels.includes(id));
  });
}

test('invalid debug identifiers and non-boolean values cannot unlock unknown game content', () => {
  const save = api.editDebugProgress(fresh(), { levels: { Missing: true, Urwaldkronen: 'true' }, worlds: { moon: true }, switches: { moon: true } });
  assert.deepEqual(plain(save.unlockedLevels), ['Wuestenexperte']);
  assert.deepEqual(plain(save.unlockedWorlds), ['desert']);
});

test('resetting and re-enabling a secret in the same draft still clears the old attempt', () => {
  const save = { ...preview(), completedLevels: ['Kristallschatz'], bonusChallenges: { underground: { status: 'complete', recordMs: 21000 } } };
  const next = api.editDebugProgress(save, { resetSwitches: ['underground'], switches: { underground: true } });
  assert.equal(bonus.bonusState(next, 'underground').status, 'ready');
  assert.equal(bonus.bonusState(next, 'underground').recordMs, undefined);
  assert.ok(!next.completedLevels.includes('Kristallschatz'));
});

test('manual jungle levels take precedence over both the boss gate and preview unlocks', () => {
  const code = strip(source('scenes/jungle/JungleMapScene.js')).split('const style =')[0];
  const { jungleMapUnlocks } = vm.runInNewContext(code + '\n({jungleMapUnlocks});', { debugLevelUnlocks: api.debugLevelUnlocks });
  const save = api.editDebugProgress(fresh(), { levels: { UrwaldShop: true, Lianenpfad: false } });
  assert.ok(jungleMapUnlocks(save).has('UrwaldShop'));
  assert.equal(jungleMapUnlocks(save, true).has('Lianenpfad'), false);
});

const keysContext = vm.createContext({});
vm.runInContext(strip(source('utils/controlProfiles.js')), keysContext);
vm.runInContext(source('utils/PortableControls.js').replace(/^import .*;\n/gm, '')
  .replace('export default class PortableControls', 'globalThis.Controls = class PortableControls').replace(/export /g, ''), keysContext);
for (const profile of ['ipadKeyboard', 'pc', 'ipadTouch']) {
  test(profile + ': secret 3 opens once per press, never leaks to the old editor, and also closes from a checkbox', () => {
    const controls = Object.create(keysContext.Controls.prototype), keyboard = new EventEmitter(); let count = 0, oldEditor = 0;
    keyboard.on('keydown-THREE', () => oldEditor++);
    controls.game = { debugMenu: { isOpen: false, toggle() { count++; this.isOpen = !this.isOpen; } } };
    controls.getProfile = () => profile; controls.activeScene = () => ({ input: { keyboard } }); controls.pressedKeys = new Set();
    const event = { code: 'Digit3', preventDefault() {}, stopImmediatePropagation() {} };
    controls.onKey(event, true); controls.onKey(event, true); assert.equal(count, 1);
    controls.onKey(event, false);
    controls.onKey({ ...event, target: { tagName: 'INPUT', type: 'checkbox' } }, true);
    assert.equal(count, 2); assert.equal(oldEditor, 0);
  });
}

test('iPad key-only event for 3 is recognized without changing any ordinary key bindings', () => {
  assert.equal(keysContext.canonicalCode({ code: 'Unidentified', key: '3' }), 'Digit3');
  assert.equal(keysContext.actionForKey({ code: 'KeyJ' }, 'ipadKeyboard'), 'yes');
  assert.equal(keysContext.actionForKey({ code: 'KeyN' }, 'pc'), 'no');
  assert.equal(keysContext.actionForKey({ code: 'Enter' }, 'ipadKeyboard'), 'confirm');
});

test('saving debug edits happens after scene shutdown checkpoints, so a running bonus cannot overwrite its reset', () => {
  const gameEvents = new EventEmitter(); let save = { ...preview(), bonusChallenges: { underground: { status: 'running', collected: ['g:0'] } } }, result;
  const uiContext = vm.createContext({ editDebugProgress: api.editDebugProgress, saveProgress: value => { result = value; } });
  vm.runInContext(source('ui/DebugMenu.js').replace(/^import .*;\n/gm, '')
    .replace('export default class DebugMenu', 'globalThis.DebugMenu = class DebugMenu'), uiContext);
  const menu = Object.create(uiContext.DebugMenu.prototype);
  menu.changes = { switches: { underground: false } }; menu.close = () => {};
  menu.scene = { scene: { stop() { save = { ...save, coins: 320, bonusChallenges: { underground: { status: 'running', collected: ['g:0', 'g:1'] } } }; } } };
  menu.game = { events: gameEvents, registry: { get: () => save, set: (_, value) => { save = value; } },
    portableControls: {}, scene: { start: key => { assert.equal(key, 'MainMenuScene'); } } };
  menu.apply(); gameEvents.emit('poststep');
  assert.equal(result.coins, 320); assert.equal(result.bonusChallenges.underground, undefined);
  assert.ok(!result.unlockedLevels.includes('Kristallschatz'));
});
