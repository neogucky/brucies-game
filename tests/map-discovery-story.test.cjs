const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { EventEmitter } = require('node:events');
const source = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const strip = code => code.replace(/^import .*;\n/gm, '').replace(/export /g, '');
const discovery = vm.runInNewContext(strip(source('src/utils/mapDiscovery.js')) + '\n({planMapDiscovery, rememberMapDiscovery, finishExpertIntroduction, mapPathId});');
const story = vm.runInNewContext(strip(source('src/utils/dragonStory.js')) + '\n({DRAGON_CLUES, DRAGON_TRACKS, DRAGON_CLUE_CUES, queueDragonClue, completeDragonClue, startPendingDragonClue, dragonClueFrame});');
const plain = value => JSON.parse(JSON.stringify(value));
const nodes = [
  { id: 'expert', x: 195, y: 290, neighbors: ['ruin'] },
  { id: 'ruin', x: 180, y: 490, neighbors: ['expert', 'shop'] },
  { id: 'shop', x: 420, y: 410, neighbors: ['ruin', 'last'] },
  { id: 'last', x: 720, y: 460, neighbors: ['shop'] },
];
const fresh = () => ({ coins: 47, mapReveals: { desert: { nodes: ['expert'], paths: [] } }, unlockedLevels: ['expert'] });
const plan = save => discovery.planMapDiscovery(save, 'desert', nodes, [], new Set(save.unlockedLevels), 'expert');

test('a new adventure begins at the professor, with no ruin or future path unlocked', () => {
  const defaults = vm.runInNewContext(strip(source('src/saveManager.js')) + '\ndefaultSave;');
  assert.equal(defaults.currentLevel, 'Wuestenexperte');
  assert.equal(defaults.mapState.desertNode, 'Wuestenexperte');
  assert.deepEqual(plain(defaults.unlockedLevels), ['Wuestenexperte']);
  assert.deepEqual(plain(defaults.mapReveals.desert), { nodes: ['Wuestenexperte'], paths: [] });
  const first = plan(fresh());
  assert.deepEqual([...first.visibleNodes], ['expert']);
  assert.equal(first.visiblePaths.size, 0); assert.equal(first.steps.length, 0);
});

test('confirming a new hero marks the adventure as playable again from the main menu', () => {
  const ctx = vm.createContext({ Phaser: { Scene: class {} }, saveProgress() {} });
  vm.runInContext(source('src/scenes/CharacterSelectScene.js').replace(/^import .*;\n/gm, '')
    .replace('export default class CharacterSelectScene', 'globalThis.Selection = class CharacterSelectScene'), ctx);
  const scene = new ctx.Selection(); let save = { lastPlayed: null, currentLevel: 'Wuestenexperte', coins: 0 }, destination;
  scene.registry = { get: () => save, set: (_, next) => { save = next; } };
  scene.scene = { start: key => { destination = key; } }; scene.selectedIndex = 1;
  scene.confirmSelection();
  assert.ok(Number.isFinite(Date.parse(save.lastPlayed))); assert.equal(save.currentLevel, 'Wuestenexperte');
  assert.equal(save.playerGender, 'female'); assert.equal(destination, 'DessertMapScene');
});

test('finishing the desert conversation unlocks the ruin while preserving discoveries and other introductions', () => {
  const save = { coins: 47, unlockedLevels: ['Wuestenexperte'], discoveries: ['sword'], expertIntroductions: { jungle: true } };
  const next = discovery.finishExpertIntroduction(save, 'desert');
  assert.ok(next.unlockedLevels.includes('Wuestenruine'));
  assert.equal(next.expertIntroductions.desert, true); assert.equal(next.expertIntroductions.jungle, true);
  assert.equal(next.coins, 47); assert.deepEqual(plain(next.discoveries), ['sword']);
  assert.deepEqual(save.unlockedLevels, ['Wuestenexperte']);
  assert.equal(discovery.finishExpertIntroduction(save, 'jungle').unlockedLevels.includes('Wuestenruine'), false);
});

test('several unlocks reveal a connected trail outward from the known place, with no future marker visible early', () => {
  const save = { ...fresh(), unlockedLevels: nodes.map(n => n.id) }, next = plan(save);
  assert.deepEqual([...next.visibleNodes], ['expert']); assert.equal(next.visiblePaths.size, 0);
  assert.deepEqual(plain(next.steps.map(s => [s.from.id, s.to.id, s.newNode])),
    [['expert', 'ruin', 'ruin'], ['ruin', 'shop', 'shop'], ['shop', 'last', 'last']]);
  assert.equal(plan(fresh()).steps.length, 0);
});

test('old saves and the explicit unlock-all preview display their unlocked places without queuing every animation', () => {
  const legacy = { coins: 47, unlockedLevels: nodes.map(n => n.id) };
  assert.equal(plan(legacy).steps.length, 0);
  assert.equal(plan(legacy).visibleNodes.size, 4);
  const preview = discovery.planMapDiscovery({ ...fresh(), unlockedLevels: legacy.unlockedLevels }, 'desert', nodes, [], new Set(legacy.unlockedLevels), 'expert', true);
  assert.equal(preview.steps.length, 0); assert.equal(preview.visibleNodes.size, 4);
});

test('a new world keeps its entrance known and reveals only reachable new places and the newly opened exit', () => {
  const under = [{ id: 'UnderShop', x: 570, y: 130, neighbors: ['Mine'] }, { id: 'Mine', x: 205, y: 383, neighbors: ['UnderShop'] }];
  const exits = [[under[0], { id: '@desert', x: 467, y: -30 }], [under[1], { id: '@jungle', x: 990, y: 444 }]];
  const next = discovery.planMapDiscovery({ mapReveals: {} }, 'underground', under, exits, new Set(['UnderShop', 'Mine']), 'UnderShop');
  assert.ok(next.visibleNodes.has('@desert')); assert.ok(!next.visibleNodes.has('@jungle'));
  assert.ok(next.visiblePaths.has(discovery.mapPathId('UnderShop', '@desert')));
  assert.deepEqual(plain(next.steps.map(s => s.newNode)), ['Mine', '@jungle']);
});

function runtimeFixture(save, testing = false) {
  let stored = structuredClone(save), writes = 0;
  const ctx = vm.createContext({ ...discovery, saveProgress() { writes++; } });
  vm.runInContext(strip(source('src/utils/worldMapRoutes.js')), ctx);
  vm.runInContext(source('src/utils/WorldMapDiscovery.js').replace(/^import .*;\n/gm, '')
    .replace('export default class WorldMapDiscovery', 'globalThis.Discovery = class WorldMapDiscovery'), ctx);
  const object = () => ({ visible: true, alpha: 1, scale: 1, y: 100,
    setVisible(v) { this.visible = v; return this; }, setAlpha(v) { this.alpha = v; return this; },
    setScale(v) { this.scale = v; return this; }, setY(v) { this.y = v; return this; } });
  const graphics = { setDepth() { return this; }, clear() { return this; }, fillStyle() { return this; }, fillCircle() { return this; } };
  const events = new EventEmitter();
  const scene = { unlocked: new Set(save.unlockedLevels), currentNode: nodes[0], nodeSprites: new Map(nodes.map(n => [n.id, { icon: object(), label: object(), shadow: object(), extras: [object()] }])),
    registry: { get: key => key === 'unlockAllForTesting' ? testing : stored, set: (_, value) => { stored = value; } },
    add: { graphics: () => graphics }, pathGraphics: { redraw() {} }, sound: { play() {} }, tweens: { add() {} },
    events: { on(event, fn, scope) { events.on(event, fn.bind(scope)); }, once(event, fn, scope) { events.once(event, fn.bind(scope)); }, off() {} } };
  const controller = new ctx.Discovery(scene, 'desert', nodes);
  return { scene, controller, saved: () => plain(stored), writes: () => writes, events };
}

test('the destination, label, shadow and decoration stay hidden until the trail arrives; interrupted growth resumes on revisit', () => {
  const save = { ...fresh(), unlockedLevels: ['expert', 'ruin'] };
  const first = runtimeFixture(save), marker = first.scene.nodeSprites.get('ruin');
  for (const o of [marker.icon, marker.label, marker.shadow, ...marker.extras]) assert.equal(o.visible, false);
  first.controller.update(0, 100);
  assert.equal(first.scene.isRevealingMap, true); assert.equal(marker.icon.visible, false);
  assert.equal(first.saved().mapReveals.desert.paths.length, 0, 'an unfinished route is not recorded as complete');
  first.events.emit('shutdown');
  const resumed = runtimeFixture(first.saved());
  assert.equal(resumed.scene.nodeSprites.get('ruin').icon.visible, false);
  for (let i = 0; i < 30; i++) resumed.controller.update(i * 100, 100);
  const shown = resumed.scene.nodeSprites.get('ruin');
  for (const o of [shown.icon, shown.label, shown.shadow, ...shown.extras]) assert.equal(o.visible, true);
  assert.equal(resumed.scene.isRevealingMap, false); assert.equal(resumed.saved().coins, 47);
  assert.ok(resumed.saved().mapReveals.desert.nodes.includes('ruin'));
  const revisit = runtimeFixture(resumed.saved()); assert.equal(revisit.scene.isRevealingMap, false);
});

test('preview reveal history is temporary and does not consume a real unlock animation', () => {
  const r = runtimeFixture({ ...fresh(), unlockedLevels: nodes.map(n => n.id) }, true);
  assert.equal(r.writes(), 0); assert.equal(r.scene.isRevealingMap, false);
  assert.deepEqual(r.saved().mapReveals.desert.nodes, ['expert']);
});

for (const world of Object.keys(story.DRAGON_CLUES)) {
  test(world + ': a saved pending clue survives reload, skips once, and cannot be requeued after being seen', () => {
    const original = { coins: 123, completedLevels: [story.DRAGON_CLUES[world].level] };
    const queued = story.queueDragonClue(original, world), reloaded = plain(queued), starts = [];
    assert.deepEqual(plain(story.queueDragonClue(queued, world).pendingDragonClues), [world]);
    const scene = { registry: { get: () => reloaded }, scene: { start: (...args) => starts.push(args) } };
    assert.equal(story.startPendingDragonClue(scene, world), true);
    assert.deepEqual(plain(starts), [['DragonClueScene', { world }]]);
    const seen = story.completeDragonClue(reloaded, world);
    assert.equal(seen.coins, 123); assert.deepEqual(plain(seen.pendingDragonClues), []);
    assert.ok(seen.storyCluesSeen.includes(world));
    assert.equal(story.queueDragonClue(seen, world), seen);
    scene.registry.get = () => seen;
    assert.equal(story.startPendingDragonClue(scene, world), false);
  });
  test(world + ': the animated clue has grounded finite actors, readable story beats and a definite automatic ending', () => {
    const duration = story.DRAGON_CLUES[world].duration, beats = new Set();
    for (const reduced of [false, true]) for (let t = 0; t <= duration; t += 100) {
      const f = story.dragonClueFrame(world, t, reduced); beats.add(f.beat);
      assert.equal(f.caption, '', 'the action is told by characters and camera cuts, without explanatory captions');
      for (const value of [f.hero.x, f.hero.y, f.helper.x, f.helper.y, f.helper.groundY, f.cameraZoom, f.fade]) assert.ok(Number.isFinite(value));
      assert.ok(f.helper.y <= f.helper.groundY + 1e-9);
      assert.ok(f.fade >= 0 && f.fade <= 1); assert.equal(f.done, t >= duration);
    }
    assert.ok(beats.size >= 5);
    const marks = story.DRAGON_TRACKS[world]?.length || 0;
    for (let t = 0; t <= duration; t += 100) assert.equal(story.dragonClueFrame(world, t).trackCount, marks,
      'footprints remain in the landscape from the first shot, without popping into existence');
    assert.equal(story.dragonClueFrame(world, duration).done, true);
  });
}

test('the distant desert footprint is noticed before the helper leaves the knight, with time to see the exclamation', () => {
  const opening = story.dragonClueFrame('desert', 900), notice = story.dragonClueFrame('desert', 2700);
  const [x, y] = story.DRAGON_TRACKS.desert[0];
  assert.ok(Math.hypot(x - opening.hero.x, y - opening.hero.y) > 300);
  assert.ok(Math.hypot(x - opening.helper.x, y - opening.helper.groundY) > 200);
  assert.equal(notice.surprise, true); assert.equal(notice.shot, 'wide');
  assert.equal(opening.hero.walking, true); assert.equal(opening.helper.hopping, true);
  assert.ok(notice.helper.x > opening.helper.x); assert.equal(notice.helper.hopping, false);
  assert.equal(story.dragonClueFrame('desert', 3200).surprise, true);
  assert.equal(notice.helper.x, story.dragonClueFrame('desert', 3200).helper.x);
  const hopping = story.dragonClueFrame('desert', 4000);
  assert.ok(hopping.helper.x > notice.helper.x); assert.ok(hopping.helper.y < hopping.helper.groundY);
  assert.equal(hopping.surprise, false);
});

test('the closeup shows the same footprint and both actors after the helper arrives, then cuts back to the wide shot', () => {
  const before = story.dragonClueFrame('desert', 6199), close = story.dragonClueFrame('desert', 6200);
  const pointing = story.dragonClueFrame('desert', 7200), back = story.dragonClueFrame('desert', 9400);
  assert.equal(pointing.helper.pose, 'point'); assert.equal(pointing.hero.pose, 'inspect');
  assert.equal(before.shot, 'wide'); assert.equal(close.shot, 'closeup'); assert.equal(back.shot, 'wide');
  assert.equal(close.hero.walking, false); assert.equal(close.helper.hopping, false);
  for (const name of ['hero', 'helper']) for (const axis of ['x', 'y']) assert.equal(close[name][axis], before[name][axis]);
  assert.ok(close.cameraZoom > before.cameraZoom * 2);
  const [trackX, trackY] = story.DRAGON_TRACKS.desert[0];
  assert.ok(Math.hypot(pointing.helper.x - trackX, pointing.helper.groundY - trackY) < 55);
  const actorsAndTrack = [close.hero, { x: close.helper.x, y: close.helper.groundY }, { x: trackX, y: trackY }];
  for (const actor of actorsAndTrack) {
    const screenX = 480 + (actor.x - close.cameraX) * close.cameraZoom;
    const screenY = 300 + (actor.y - close.cameraY) * close.cameraZoom;
    assert.ok(screenX > 140 && screenX < 820); assert.ok(screenY > 300 && screenY < 510);
  }
  assert.equal(back.helper.x, pointing.helper.x); assert.equal(back.hero.x, pointing.hero.x);
  assert.equal(back.cameraZoom, 1); assert.equal(back.cameraX, 480); assert.equal(back.cameraY, 300);
});

test('after seeing the footprint the knight follows behind the helper all the way into the actual cave mouth', () => {
  assert.equal(story.dragonClueFrame('desert', 9000).hero.walking, false);
  for (let t = 10100; t < 16700; t += 100) {
    const f = story.dragonClueFrame('desert', t);
    assert.ok(f.hero.x < f.helper.x); assert.ok(f.hero.y > f.helper.groundY);
    assert.equal(f.hero.walking, true); assert.equal(f.shot, 'wide');
    for (const actor of [f.hero, f.helper]) if (actor.x < 788) assert.equal(actor.opacity, 1);
  }
  const ending = story.dragonClueFrame('desert', 18400);
  for (const actor of [ending.hero, ending.helper]) {
    assert.ok(actor.x >= 810 && actor.x <= 820); assert.ok((actor.groundY || actor.y) >= 310 && (actor.groundY || actor.y) <= 320);
    assert.equal(actor.opacity, 0); assert.ok(actor.caveDepth > .9);
  }
});

test('reduced motion preserves the same cuts, discoveries and cave route while reducing the helper hops', () => {
  for (const t of [900, 1600, 3200, 5200, 5900, 8500, 10000, 12500, 15500, 17400]) {
    const a = story.dragonClueFrame('desert', t), b = story.dragonClueFrame('desert', t, true);
    assert.equal(a.shot, b.shot); assert.equal(a.cameraZoom, b.cameraZoom); assert.equal(a.trackCount, b.trackCount);
    assert.equal(a.helper.x, b.helper.x); assert.equal(a.helper.groundY, b.helper.groundY);
    assert.equal(a.hero.x, b.hero.x); assert.equal(a.hero.y, b.hero.y);
    assert.equal(a.helper.opacity, b.helper.opacity);
    assert.ok(b.helper.groundY - b.helper.y <= a.helper.groundY - a.helper.y + 1e-9);
  }
});

test('the discovery sound coincides with noticing the distant tracks, before the approach and closeup', () => {
  const [at, cue] = story.DRAGON_CLUE_CUES.desert.find(([, cue]) => cue === 'chime');
  assert.equal(cue, 'chime'); assert.equal(story.dragonClueFrame('desert', at).surprise, true);
  assert.equal(story.dragonClueFrame('desert', at).helper.hopping, false);
  for (const [time] of story.DRAGON_CLUE_CUES.desert) assert.ok(time > 0 && time < story.DRAGON_CLUES.desert.duration);
});

test('the underground leaflet stays on the floor until a visible pickup, then the camera cuts over the shoulder', () => {
  const found = story.dragonClueFrame('underground', 5500), pickup = story.dragonClueFrame('underground', 6800);
  assert.equal(found.helper.pose, 'beckon'); assert.equal(found.groundBrochure, true);
  assert.equal(pickup.hero.pose, 'pick'); assert.equal(pickup.groundBrochure, false);
  assert.equal(story.dragonClueFrame('underground', 7900).hero.pose, 'lift');
  assert.equal(story.dragonClueFrame('underground', 8700).hero.pose, 'read');
  const before = story.dragonClueFrame('underground', 8999), reading = story.dragonClueFrame('underground', 9000);
  assert.equal(before.shot, 'wide'); assert.equal(reading.shot, 'shoulder');
  assert.deepEqual(plain(before.hero), plain(reading.hero));
  assert.equal(story.dragonClueFrame('underground', 12600).shot, 'wide');
  assert.equal(story.dragonClueFrame('underground', 14000).hero.walking, true);
});

test('the jungle discovery leads to a wet-foot surprise and a lake closeup without the knight walking into the water', () => {
  assert.equal(story.dragonClueFrame('jungle', 5200).helper.pose, 'beckon');
  const showing = story.dragonClueFrame('jungle', 6500), splash = story.dragonClueFrame('jungle', 12500);
  assert.equal(showing.shot, 'closeup'); assert.equal(showing.helper.pose, 'point'); assert.equal(showing.hero.pose, 'inspect');
  assert.ok(splash.splash > 0); assert.equal(splash.surprise, true);
  const water = story.dragonClueFrame('jungle', 14500), last = story.dragonClueFrame('jungle', 18000);
  assert.equal(water.shot, 'lake'); assert.ok(water.ripple > 0); assert.ok(water.treasure > .18);
  assert.ok(water.helper.x < splash.helper.x); assert.equal(last.hero.x, 630); assert.equal(last.hero.pose, 'point');
  assert.equal(last.shot, 'wide'); assert.equal(last.hero.opacity, undefined);
});

test('every camera framing stays inside the painted background, including the closeup at the right edge of the lake', () => {
  for (const world of Object.keys(story.DRAGON_CLUES)) for (let t = 0; t <= story.DRAGON_CLUES[world].duration; t += 100) {
    const f = story.dragonClueFrame(world, t), halfW = 480 / f.cameraZoom, halfH = 300 / f.cameraZoom;
    assert.ok(f.cameraX - halfW >= 0 && f.cameraX + halfW <= 960);
    assert.ok(f.cameraY - halfH >= 0 && f.cameraY + halfH <= 600);
  }
});
