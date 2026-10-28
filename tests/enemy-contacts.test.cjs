const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../src/utils/EnemyContacts.js'), 'utf8')
  .replace('export default class EnemyContacts', 'globalThis.EnemyContacts = class EnemyContacts').replace(/export /g, ''), context);
const box = (x, y, width = 30, height = 60) => ({ x, y, width, height });
const separate = (...args) => JSON.parse(JSON.stringify(context.contactSeparation(...args)));
const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
function setup() {
  const body = { ...box(0, 100), velocity: { x: 210, y: 0 }, blocked: {} };
  body.position = body;
  const monkey = { x: 70, y: 160, active: true, stunnedUntil: 0 };
  const sounds = [], hits = [];
  const scene = { worldTime: 1000, gameMode: 'jump', player: { x: 15, y: 160, active: true, body },
    monkeys: [monkey], enemyBounds: m => box(m.x - 22, m.y - 56, 44, 54),
    takeJungleHit: n => hits.push(n), playJungleSound: key => sounds.push(key) };
  return { scene, body, monkey, hits, sounds, contacts: new context.EnemyContacts(scene) };
}
const move = (s, x, y = s.player.body.y) => {
  s.player.x += x - s.player.body.x; s.player.y += y - s.player.body.y;
  s.player.body.x = x; s.player.body.y = y;
};
test('running into an enemy stops on its near side', () => {
  assert.deepEqual(separate(box(25, 100), box(48, 104, 44, 54), box(0, 100)), { x: -8, y: 0 });
});
test('approaching from the right stops on the right', () => {
  assert.deepEqual(separate(box(80, 100), box(48, 104, 44, 54), box(120, 100)), { x: 13, y: 0 });
});
test('fast dash cannot pass through an entire enemy', () => {
  assert.deepEqual(separate(box(140, 100), box(48, 104, 44, 54), box(0, 100)), { x: -123, y: 0 });
});
test('relative sweep catches an enemy moving through a stationary hero', () => {
  assert.deepEqual(separate(box(50, 100), box(0, 104, 44, 54), box(50, 100), box(100, 104, 44, 54)), { x: -81, y: 0 });
});
test('different elevations do not block horizontal movement', () => {
  assert.equal(separate(box(140, 400), box(48, 104, 44, 54), box(0, 400)), null);
});

test('enemy separation cannot push the knight through a solid castle wall', () => {
  const { scene, body, contacts } = setup();
  scene.solidScenery = [box(0, 70, 80, 30)];
  scene.physics = { world: { bounds: box(0, 0, 960, 600) } };
  assert.equal(contacts.canPlace(box(5, 75, 30, 60)), false);
  assert.equal(contacts.canPlace(box(90, 100, 30, 60)), true);
  scene.enemyBounds = () => box(0, 140, 50, 35);
  contacts.update();
  assert.equal(body.y, 100); assert.ok(body.x >= 50);
  assert.equal(intersects(body, scene.solidScenery[0]), false);
});
test('a jump crossing underneath an enemy stops at its underside', () => {
  assert.deepEqual(separate(box(52, 130), box(48, 104, 44, 54), box(52, 170)), { x: 0, y: 29 });
});
test('a landing is separated above the enemy', () => {
  assert.deepEqual(separate(box(52, 70), box(48, 104, 44, 54), box(52, 0)), { x: 0, y: -27 });
});
test('an existing overlap is resolved with the smallest correction', () => {
  assert.deepEqual(separate(box(30, 100), box(48, 104, 44, 54)), { x: -13, y: 0 });
});
test('one contact causes one heart of damage and never leaves the hero inside', () => {
  const { scene, body, monkey, hits, contacts, sounds } = setup();
  contacts.update(); move(scene, 26); contacts.update();
  assert.equal(body.x, 17); assert.equal(body.velocity.x, 0);
  assert.equal(intersects(body, scene.enemyBounds(monkey)), false);
  for (let i = 0; i < 300; i++) { scene.worldTime += 16; move(scene, body.x + 4); contacts.update(); }
  assert.deepEqual(hits, [1]); assert.deepEqual(sounds, ['sfx-monster-attack']);
});
test('retreating and walking into the enemy again starts a fresh contact', () => {
  const { scene, body, hits, contacts } = setup();
  contacts.update(); move(scene, 26); contacts.update();
  move(scene, body.x - 15); contacts.update(); move(scene, 26); contacts.update();
  assert.deepEqual(hits, [1, 1]);
});
test('backing away is not blocked or teleported through the enemy', () => {
  const { scene, body, contacts } = setup();
  contacts.update(); move(scene, 26); contacts.update();
  body.velocity.x = -210; move(scene, 2); contacts.update();
  assert.equal(body.x, 2); assert.equal(body.velocity.x, -210);
});
test('stunned monkeys stay solid and cause no touch damage on recovery without a new bump', () => {
  const { scene, body, monkey, hits, contacts } = setup();
  monkey.stunnedUntil = 1500;
  contacts.update(); move(scene, 26); contacts.update();
  assert.equal(body.x, 17); assert.deepEqual(hits, []);
  scene.worldTime = 2000; move(scene, 26); contacts.update();
  assert.deepEqual(hits, []);
});
test('destroyed enemies immediately stop blocking the path', () => {
  const { scene, body, monkey, contacts } = setup();
  contacts.update(); move(scene, 26); contacts.update(); monkey.active = false;
  move(scene, 60); contacts.update(); assert.equal(body.x, 60);
  assert.equal(contacts.touching.size, 0);
});
test('paused or completed levels cannot deal contact damage', () => {
  for (const flag of ['isPaused', 'isGameOver', 'isComplete', 'levelCompleted']) {
    const { scene, hits, contacts } = setup(); scene[flag] = true;
    move(scene, 26); contacts.update(); assert.deepEqual(hits, []);
  }
});
test('separation does not cancel a jump when colliding horizontally', () => {
  const { scene, body, contacts } = setup(); contacts.update();
  move(scene, 26); body.velocity.y = -480; contacts.update();
  assert.equal(body.velocity.y, -480);
});
test('stone bosses retain three damage on drops and two while rolling', () => {
  for (const [state, damage] of [['dropping', 3], ['rolling', 2]]) {
    const { scene, contacts, hits } = setup(); delete scene.monkeys;
    const stone = { active: true, getData: key => ({ stoneState: state, isStoneBoss: true })[key] };
    scene.stoneMonstersGroup = { getChildren: () => [stone] };
    scene.getStoneMonsterHitbox = () => box(48, 104, 44, 54);
    scene.applyStoneMonsterPlayerHit = (_, n) => hits.push(n);
    contacts.update(); move(scene, 26); contacts.update(); assert.deepEqual(hits, [damage]);
  }
});
test('inactive, emerging and returning enemies do not block the hero', () => {
  const { scene } = setup(); delete scene.monkeys;
  scene.monsters = { getChildren: () => [{ active: true, getData: key => key === 'emerging', body: box(0, 0) }] };
  scene.stoneMonstersGroup = { getChildren: () => [{ active: true, getData: () => 'returning' }] };
  assert.equal(context.getContactEnemies(scene).length, 0);
});
test('a stone above a hero on solid floor separates sideways instead of pushing into earth', () => {
  const { scene, body, contacts } = setup();
  scene.tileSize = 10; scene.blockMap = new Map();
  scene.physics = { world: { bounds: { x: 0, y: 0, width: 960, height: 600 } } };
  for (let x = 0; x < 20; x++) scene.blockMap.set(x + ',16', { active: true });
  scene.enemyBounds = () => box(0, 90, 50, 30);
  contacts.update();
  assert.equal(body.x, 51); assert.equal(body.y, 100);
  assert.equal(intersects(body, scene.enemyBounds()), false);
});

test('a moving stone cannot crush the hero into a tight tunnel wall', () => {
  const { scene, body, contacts } = setup(); delete scene.monkeys;
  scene.tileSize = 10; scene.blockMap = new Map();
  scene.physics = { world: { bounds: { x: 0, y: 0, width: 960, height: 600 } } };
  move(scene, 10, 100);
  for (let col = 0; col < 96; col++) {
    scene.blockMap.set(col + ',9', { active: true }); scene.blockMap.set(col + ',16', { active: true });
  }
  for (let row = 10; row < 16; row++) {
    scene.blockMap.set('0,' + row, { active: true }); scene.blockMap.set('6,' + row, { active: true });
  }
  const stone = { x: 100, y: 100, active: true, getData: key => key === 'stoneState' ? 'rolling' : false };
  scene.stoneMonstersGroup = { getChildren: () => [stone] };
  scene.getStoneMonsterHitbox = m => box(m.x, m.y, 44, 58);
  scene.applyStoneMonsterPlayerHit = () => {};
  contacts.update(); stone.x = 20; contacts.update();
  assert.equal(stone.x, 100); assert.equal(body.x, 10);
  assert.equal(intersects(body, scene.getStoneMonsterHitbox(stone)), false);
});

test('desert contacts use physics bodies and preserve their normal attack handler', () => {
  const { scene, contacts, hits } = setup(); delete scene.monkeys;
  const monster = { active: true, body: box(48, 104, 44, 54), getData: () => 0 };
  scene.monsters = { getChildren: () => [monster] };
  scene.handlePlayerHit = (hero, enemy) => { assert.equal(hero, scene.player); assert.equal(enemy, monster); hits.push(1); };
  contacts.update(); move(scene, 26); contacts.update();
  assert.deepEqual(hits, [1]); assert.equal(scene.player.body.x, 17);
});
