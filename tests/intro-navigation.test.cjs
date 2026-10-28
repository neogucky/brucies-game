const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

// Real scene methods and the complete input handoff, including Phaser's deferred
// scene starts. Earlier tests replaced finish() and immediately changed scenes,
// so they never exercised loading, focus or the following menu's Continue action.
function fixture(world = 'desert') {
  const window = new EventTarget(), document = new EventTarget();
  const canvas = { tagName: 'CANVAS', addEventListener() {}, removeEventListener() {},
    focus() { document.activeElement = canvas; } };
  Object.assign(document, { body: { classList: { remove() {} } }, getElementById() { return null; },
    activeElement: { tagName: 'BUTTON' } });
  const data = new Map([['saveData', { lastPlayed: '2026-10-29', currentWorld: world,
    currentLevel: 'resume-level', unlockedWorlds: [world], health: 2, coins: 73 }]]);
  const registry = { get: key => data.get(key), set: (key, value) => data.set(key, value) };
  const queue = [], starts = [], writes = [];
  let active = null, destroyed = 0;
  const manager = { start(key, args = {}) { queue.push([key, args]); } };
  const ctx = vm.createContext({ window, document, performance: { now: () => 100 },
    Phaser: { Scene: class {} }, normalizeWorldProgress: value => value,
    saveProgress: value => writes.push(value), playMusic() {} });
  for (const [file, name] of [['utils/controlProfiles.js'], ['utils/storyPreview.js'],
    ['utils/PortableControls.js', 'Controls'], ['scenes/IntroScene.js', 'Intro'], ['scenes/MainMenuScene.js', 'Menu']]) {
    let code = read('src/' + file).replace(/^import .*;\n/gm, '');
    if (name) code = code.replace(/export default class \w+/, 'globalThis.' + name + ' = class');
    vm.runInContext('{' + code.replace(/export /g, '') + '}', ctx);
  }
  const controls = new ctx.Controls({ canvas, registry, scene: { getScenes: () => active ? [active] : [] } });
  const menu = new ctx.Menu(); Object.assign(menu, { registry, scene: manager, input: { keyboard: new EventEmitter() } });
  for (const method of ['addBackground', 'addTitle', 'createSettingsDialog', 'updateSelection']) menu[method] = () => {};
  menu.addMenu = () => { menu.menuItems = [{ enabled: true, action: () => menu.loadGame() }]; };
  const intro = new ctx.Intro(); Object.assign(intro, { registry, scene: manager, elapsed: 900,
    sys: { settings: { key: 'IntroScene' } }, audio: { destroy() { destroyed++; }, unlock() {} } });
  const flush = () => {
    while (queue.length) {
      const [key, args] = queue.shift(); starts.push(key);
      if (key === 'MainMenuScene') {
        active = menu; menu.sys = { settings: { key } }; menu.init(args);
        menu.input.keyboard.removeAllListeners(); menu.create();
      } else active = { sys: { settings: { key } }, input: { keyboard: new EventEmitter() } };
    }
    controls.update();
  };
  const key = (code, down = true, repeat = false, target = window) => {
    const e = new Event(down ? 'keydown' : 'keyup', { cancelable: true });
    Object.assign(e, { code, repeat }); target.dispatchEvent(e); return e;
  };
  return { controls, canvas, document, window, intro, menu, registry, starts, writes, flush, key,
    setActive(scene) { active = scene; controls.update(); }, destroyed: () => destroyed };
}

for (const code of ['Space', 'Enter']) test(code + ': window-targeted skip reaches the menu once and Continue never replays the intro', () => {
  const f = fixture();
  try {
    f.setActive(f.intro);
    assert.equal(f.key(code).defaultPrevented, true);
    assert.equal(f.intro.leaving, true);
    // Both a normal repeat and iPad covers' unflagged repeated keydowns must
    // stay consumed before AND after the queued menu transition.
    f.key(code, true, true); f.key(code); f.flush(); f.key(code); f.key(code, true, true);
    assert.deepEqual(f.starts, ['MainMenuScene']); assert.equal(f.destroyed(), 1);
    f.key(code, false); f.key('Enter'); f.flush();
    assert.deepEqual(f.starts, ['MainMenuScene', 'DessertMapScene']);
    assert.equal(f.registry.get('saveData').coins, 73);
  } finally { f.controls.destroy(); }
});

for (const code of ['Space', 'Enter']) test(code + ': a skip pressed during loading is consumed and applied once when the intro becomes ready', () => {
  const f = fixture();
  try {
    f.setActive({ sys: { settings: { key: 'BootScene' } } });
    assert.equal(f.document.activeElement, f.canvas, 'focus moves into the game during loading');
    assert.equal(f.key(code).defaultPrevented, true, 'loading must not leave the key free to activate Reload');
    f.setActive(f.intro); f.flush(); f.key(code); f.key(code, true, true); f.flush();
    assert.deepEqual(f.starts, ['MainMenuScene']); assert.equal(f.destroyed(), 1);
    f.key(code, false); f.key('Enter'); f.flush();
    assert.deepEqual(f.starts, ['MainMenuScene', 'DessertMapScene']);
  } finally { f.controls.destroy(); }
});

for (const [world, destination] of Object.entries({ desert: 'DessertMapScene', underground: 'UndergroundMapScene',
  jungle: 'JungleMapScene', water: 'WaterMapScene' })) {
  for (const input of ['Enter', 'click']) test(world + ': Continue via ' + input + ' enters its map once, without stale movie playback', () => {
    const f = fixture(world);
    try {
      f.menu.sys = { settings: { key: 'MainMenuScene' } }; f.menu.init({}); f.menu.create(); f.setActive(f.menu);
      // A previously interrupted cinema playlist must not leak into gameplay.
      f.registry.set('storyPreview', { filmIds: ['intro'], index: 0, returnScene: 'CinemaScene' });
      if (input === 'Enter') { f.key('Enter'); f.key('Enter', true, true); }
      else { f.menu.loadGame(); f.menu.loadGame(); }
      f.flush();
      assert.deepEqual(f.starts, [destination]);
      assert.equal(f.registry.get('storyPreview'), null);
      assert.equal(f.registry.get('saveData').coins, 73); assert.equal(f.writes.length, 1);
    } finally { f.controls.destroy(); }
  });
}

test('input listeners are removed when the game is destroyed, so a later start has only one handler', () => {
  const f = fixture(); f.setActive(f.intro); f.controls.destroy();
  f.key('Space'); assert.equal(f.intro.leaving, undefined); assert.equal(f.starts.length, 0);
});

test('the actual entry module and all imported modules use the same release URL, preventing mixed cached input handlers', () => {
  const html = read('index.html'), map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  const entry = html.match(/<script type="module" src="([^"]+)"/)[1];
  assert.equal('./' + entry, map.imports['./src/main.js'], 'import maps do not version a script src automatically');
  const versions = new Set(Object.values(map.imports).map(url => new URL(url, 'https://example.test/').searchParams.get('v')));
  assert.equal(versions.size, 1, 'a release must not reuse stale versions of the input controller or scenes');
  assert.ok(!versions.has(null));
});
