const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const screenings = [];
const ctx = vm.createContext({ Phaser: { Scene: class {} }, startStoryPreview: (scene, options) => screenings.push(options) });
vm.runInContext(source('src/scenes/CinemaScene.js').replace(/^import .*;\n/gm, '')
  .replace('export default class CinemaScene', 'globalThis.CinemaScene = class CinemaScene'), ctx);
const films = ['intro', 'desert', 'underground', 'jungle'].map(id => ({ id, title: id }));
const plain = value => JSON.parse(JSON.stringify(value));
function scene(count = 4) {
  const s = new ctx.CinemaScene(); Object.assign(s, { films: films.slice(0, count), cards: [], selectedIndex: 0,
    allText: count > 1 ? {} : null, updateSelection() {} }); return s;
}

test('movie cards and Enter open one film; duplicate input cannot launch it twice', () => {
  screenings.length = 0;
  const s = scene(); s.selectedIndex = 2; s.activateSelection(); s.activateSelection(); s.playFilm('desert');
  assert.equal(screenings.length, 1);
  assert.deepEqual(plain(screenings[0]), { filmIds: ['underground'], returnScene: 'CinemaScene', selectedFilmId: 'underground' });
});

test('unavailable films cannot be started and play all uses only the currently earned cards', () => {
  screenings.length = 0;
  const s = scene(2); s.playFilm('jungle'); assert.equal(screenings.length, 0);
  s.selectedIndex = 2; s.activateSelection();
  assert.deepEqual(plain(screenings[0]), { filmIds: ['intro', 'desert'], returnScene: 'CinemaScene', selectedFilmId: 'all' });
});

test('keyboard selection reaches the lower cards and play-all button and can return to the last card', () => {
  const s = scene(); s.moveSelection(0, 1); assert.equal(s.selectedIndex, 2);
  s.moveSelection(1, 0); assert.equal(s.selectedIndex, 3);
  s.moveSelection(0, 1); assert.equal(s.selectedIndex, 4);
  s.moveSelection(0, -1); assert.equal(s.selectedIndex, 3);
  s.moveSelection(0, -1); assert.equal(s.selectedIndex, 1);
});

test('a single film remains selected, and partial grids never select an absent card', () => {
  const single = scene(1); for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { single.moveSelection(x, y); assert.equal(single.selectedIndex, 0); }
  const three = scene(3); three.selectedIndex = 1; three.moveSelection(0, 1); assert.equal(three.selectedIndex, 2);
  three.moveSelection(0, 1); assert.equal(three.selectedIndex, 3);
});

test('leaving the cinema returns to the highlighted main-menu entry without changing a save', () => {
  const s = scene(), destinations = []; s.scene = { start: (...args) => destinations.push(args) };
  s.back(); assert.deepEqual(plain(destinations), [['MainMenuScene', { selectedMenu: 'cinema' }]]);
  s.showingFilm = true; s.back(); assert.equal(destinations.length, 1);
});
