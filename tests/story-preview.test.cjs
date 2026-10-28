const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const strip = code => code.replace(/^import .*;\n/gm, '').replace(/export /g, '');
const load = (file, names, globals = {}) => vm.runInNewContext(strip(source(file)) + '\n({' + names + '});', globals);
const timeline = load('src/utils/introTimeline.js', 'INTRO_DURATION, getIntroFrame, introCuesBetween');
const story = load('src/utils/dragonStory.js', 'DRAGON_CLUES, DRAGON_CLUE_CUES, dragonClueFrame, completeDragonClue');
const preview = load('src/utils/storyPreview.js', 'STORY_PREVIEW, startStoryPreview, advanceStoryPreview, unlockedStoryFilms', { DRAGON_CLUES: story.DRAGON_CLUES });
const plain = value => JSON.parse(JSON.stringify(value));

function fixture() {
  const save = { coins: 73, health: 3, pendingDragonClues: ['underground'], storyCluesSeen: ['desert'],
    completedLevels: ['Fremdweg'], playerGender: 'female' };
  const data = new Map([['saveData', save]]), starts = [], writes = [];
  const registry = { get: key => data.get(key), set(key, value) { data.set(key, value); } };
  let now = 0, destroys = 0;
  const ctx = vm.createContext({ ...preview, ...story, ...timeline, Phaser: { Scene: class {} },
    saveProgress(value) { writes.push(value); }, performance: { now: () => now } });
  for (const name of ['IntroScene', 'DragonClueScene']) vm.runInContext('{' + source('src/scenes/' + name + '.js')
    .replace(/^import .*;\n/gm, '').replace('export default class ' + name, 'globalThis.' + name + ' = class ' + name) + '}', ctx);
  const manager = { start(key, args) { starts.push([key, plain(args || {})]); } };
  const boot = { registry, scene: manager };
  const scene = (key, args = {}) => {
    const s = Object.create(ctx[key].prototype);
    Object.assign(s, { registry, scene: manager, sys: { settings: { key } }, clueWorld: args.world,
      config: args.world ? story.DRAGON_CLUES[args.world] : undefined, elapsed: 0, lastFrameAt: 0, started: true,
      audio: { destroy() { destroys++; }, setTime() {}, play() {}, setMusicVolume() {} }, drawFrame() {} });
    return s;
  };
  return { save, registry, starts, writes, boot, scene, destroys: () => destroys, time: t => { now = t; } };
}

test('the full preview screens the intro and all three clues in order, then returns to the menu', () => {
  const f = fixture(); preview.startStoryPreview(f.boot);
  for (const entry of preview.STORY_PREVIEW) {
    const [key, args] = f.starts.at(-1);
    assert.equal(key, entry.scene); assert.equal(args.world, entry.world);
    const scene = f.scene(key, args); scene.finish(); scene.finish();
  }
  assert.deepEqual(f.starts, [['IntroScene', {}], ['DragonClueScene', { world: 'desert' }],
    ['DragonClueScene', { world: 'underground' }], ['DragonClueScene', { world: 'jungle' }], ['MainMenuScene', {}]]);
  assert.equal(f.registry.get('storyPreview'), null); assert.equal(f.destroys(), 4);
});

test('previewing or skipping every sequence never writes, consumes a pending clue or changes the save', () => {
  const f = fixture(), before = structuredClone(f.save); preview.startStoryPreview(f.boot);
  for (const entry of preview.STORY_PREVIEW) f.scene(entry.scene, { world: entry.world }).finish();
  assert.equal(f.registry.get('saveData'), f.save); assert.deepEqual(f.save, before); assert.equal(f.writes.length, 0);
});

test('automatic endings use the same preview order without needing a key press', () => {
  const f = fixture(); preview.startStoryPreview(f.boot);
  for (const entry of preview.STORY_PREVIEW) {
    const scene = f.scene(entry.scene, { world: entry.world });
    scene.elapsed = (entry.world ? story.DRAGON_CLUES[entry.world].duration : timeline.INTRO_DURATION) - 50;
    f.time(100); scene.update();
  }
  assert.equal(f.starts.length, 5); assert.equal(f.starts.at(-1)[0], 'MainMenuScene'); assert.equal(f.writes.length, 0);
});

test('a different scene cannot consume the current preview step', () => {
  const f = fixture(); preview.startStoryPreview(f.boot);
  assert.equal(preview.advanceStoryPreview(f.scene('DragonClueScene', { world: 'desert' })), false);
  assert.equal(f.starts.length, 1); assert.equal(f.registry.get('storyPreview').index, 0);
});

test('regular intro and clue completions keep their existing destinations and saving behavior', () => {
  const f = fixture(); f.scene('IntroScene').finish();
  assert.equal(f.starts.at(-1)[0], 'MainMenuScene'); assert.equal(f.writes.length, 0);
  f.scene('DragonClueScene', { world: 'underground' }).finish();
  assert.equal(f.starts.at(-1)[0], 'UndergroundMapScene'); assert.equal(f.writes.length, 1);
  assert.deepEqual(plain(f.registry.get('saveData').pendingDragonClues), []);
  assert.deepEqual(plain(f.registry.get('saveData').storyCluesSeen), ['desert', 'underground']);
});

test('opening the intro again after a preview ends does not resume the preview', () => {
  const f = fixture(); preview.startStoryPreview(f.boot);
  for (const entry of preview.STORY_PREVIEW) f.scene(entry.scene, { world: entry.world }).finish();
  f.scene('IntroScene').finish();
  assert.equal(f.starts.at(-1)[0], 'MainMenuScene'); assert.equal(f.starts.length, 6);
});

test('the cinema always offers the intro; unlocked worlds and levels alone do not reveal future films', () => {
  const save = { unlockedWorlds: ['desert', 'underground', 'jungle'], unlockedLevels: Object.values(story.DRAGON_CLUES).map(c => c.level) };
  assert.deepEqual(plain(preview.unlockedStoryFilms(save).map(film => film.id)), ['intro']);
});

for (const world of ['desert', 'underground', 'jungle']) test(world + ': finishing its last level unlocks its film, including for older saves', () => {
  const save = { completedLevels: [story.DRAGON_CLUES[world].level] };
  assert.deepEqual(plain(preview.unlockedStoryFilms(save).map(film => film.id)), ['intro', world]);
  assert.deepEqual(plain(preview.unlockedStoryFilms({ storyCluesSeen: [world] }).map(film => film.id)), ['intro', world]);
  assert.deepEqual(plain(preview.unlockedStoryFilms({ pendingDragonClues: [world] }).map(film => film.id)), ['intro', world]);
});

test('the unlock-all preview displays every film without fabricating a completion or discovery', () => {
  const save = { completedLevels: [], storyCluesSeen: [], pendingDragonClues: [] }, before = structuredClone(save);
  assert.equal(preview.unlockedStoryFilms(save, true).length, 4); assert.deepEqual(save, before);
  assert.deepEqual(plain(preview.unlockedStoryFilms(save).map(film => film.id)), ['intro']);
});

test('replaying a single unlocked movie returns to its cinema card, leaving pending story progress untouched', () => {
  const f = fixture(), before = structuredClone(f.save);
  preview.startStoryPreview(f.boot, { filmIds: ['underground'], returnScene: 'CinemaScene', selectedFilmId: 'underground' });
  assert.deepEqual(f.starts, [['DragonClueScene', { world: 'underground' }]]);
  f.scene('DragonClueScene', { world: 'underground' }).finish();
  assert.deepEqual(f.starts.at(-1), ['CinemaScene', { selectedFilmId: 'underground' }]);
  assert.equal(f.registry.get('storyPreview'), null); assert.deepEqual(f.save, before); assert.equal(f.writes.length, 0);
});

test('play all from the cinema includes only earned movies, in story order, and restores the all selection', () => {
  const f = fixture(), films = preview.unlockedStoryFilms(f.save);
  preview.startStoryPreview(f.boot, { filmIds: films.map(film => film.id), returnScene: 'CinemaScene', selectedFilmId: 'all' });
  assert.deepEqual(plain(f.registry.get('storyPreview').filmIds), ['intro', 'desert', 'underground']);
  for (const film of films) {
    const [key, args] = f.starts.at(-1); assert.equal(args.world, film.world); f.scene(key, args).finish();
  }
  assert.deepEqual(f.starts.at(-1), ['CinemaScene', { selectedFilmId: 'all' }]); assert.equal(f.writes.length, 0);
});

test('an empty movie selection never enters playback', () => {
  const f = fixture(); assert.equal(preview.startStoryPreview(f.boot, { filmIds: ['missing'] }), false);
  assert.equal(f.starts.length, 0); assert.equal(f.registry.get('storyPreview'), undefined);
});
