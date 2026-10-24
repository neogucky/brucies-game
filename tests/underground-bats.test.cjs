const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { test } = require('node:test');

const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/utils/UndergroundBats.js'), 'utf8')
  .replace('export default class UndergroundBats', 'globalThis.UndergroundBats = class UndergroundBats')
  .replace(/export /g, ''), context);

function actor(x, y, texture) {
  const data = {};
  return {
    active: true, x, y, texture, alpha: 1,
    anims: { stop() {} },
    setData(key, value) { data[key] = value; return this; }, getData(key) { return data[key]; },
    setDisplaySize() { return this; }, setDepth() { return this; },
    setTint() { return this; }, clearTint() { return this; }, setFlipX() { return this; },
    setTexture(value) { this.texture = value; return this; }, play() { return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    destroy() { this.active = false; },
  };
}
function group() {
  const children = [];
  return {
    add(value) { children.push(value); }, getChildren: () => children,
    remove(value) { const index = children.indexOf(value); if (index >= 0) children.splice(index, 1); value.destroy(); },
    destroy() { children.forEach(value => value.destroy()); children.length = 0; },
  };
}
function setup(entries = [{ col: 10, row: 7, minCol: 4, maxCol: 24 }]) {
  const damage = [], splashes = [], tweens = [];
  const scene = {
    tileSize: 40, gridCols: 30, gridRows: 16, time: { now: 1000 }, blockMap: new Map(),
    player: { x: 10000, body: { x: 10000, y: 450, width: 30, height: 70, bottom: 520 } },
    applyFlyingEnemyHit(amount) { damage.push(amount); },
    add: {
      group, sprite: actor, image: actor,
      ellipse(x, y) { const fx = actor(x, y); splashes.push(fx); return fx; },
    },
    tweens: { add(config) { tweens.push(config); } },
  };
  for (let col = 0; col < 30; col += 1) {
    scene.blockMap.set(col + ',0', { active: true });
    scene.blockMap.set(col + ',3', { active: true });
    scene.blockMap.set(col + ',15', { active: true });
  }
  for (let row = 0; row < 16; row += 1) {
    scene.blockMap.set('0,' + row, { active: true });
    scene.blockMap.set('29,' + row, { active: true });
  }
  const system = new context.UndergroundBats(scene, entries);
  return { scene, system, bat: system.group.getChildren()[0], damage, splashes, tweens };
}

test('bat patrols near the top of its free corridor and stays inside its route', () => {
  const { scene, system, bat } = setup();
  assert.equal(bat.getData('flightY'), 183);
  for (let i = 0; i < 1000; i += 1) {
    scene.time.now += 50; system.update(.05);
    assert.ok(bat.x >= bat.getData('minX') && bat.x <= bat.getData('maxX'));
    assert.ok(Math.abs(bat.y - 183) <= 3.01);
    assert.equal(system.isClearAt(bat.x, bat.getData('flightY')), true);
  }
});

test('bat descends under a hanging wall and climbs back to the ceiling on the other side', () => {
  const { scene, system, bat } = setup([{ col: 12, row: 7, minCol: 4, maxCol: 25 }]);
  for (let row = 4; row <= 8; row += 1) scene.blockMap.set('14,' + row, { active: true });
  let descended = false, crossed = false, rose = false;
  for (let i = 0; i < 350; i += 1) {
    scene.time.now += 50; system.update(.05);
    if (bat.getData('flightY') > 370) descended = true;
    if (descended && bat.x > 640) crossed = true;
    if (crossed && bat.getData('flightY') < 190) rose = true;
    assert.equal(system.isClearAt(bat.x, bat.getData('flightY')), true);
  }
  assert.equal(descended, true);
  assert.equal(crossed, true);
  assert.equal(rose, true);
});

test('bat turns around at a closed wall instead of flying through tiles', () => {
  const { scene, system, bat } = setup([{ col: 12, row: 7, minCol: 4, maxCol: 25 }]);
  for (let row = 4; row < 15; row += 1) scene.blockMap.set('14,' + row, { active: true });
  let turned = false;
  for (let i = 0; i < 150; i += 1) {
    scene.time.now += 50; system.update(.05);
    if (bat.getData('dir') === -1) turned = true;
    assert.ok(bat.x + 20 <= 560);
  }
  assert.equal(turned, true);
});

test('bat follows a newly dug higher passage without crossing the ceiling', () => {
  const { scene, system, bat } = setup();
  bat.setData('speed', 0);
  for (let col = 9; col <= 11; col += 1) scene.blockMap.delete(col + ',3');
  for (let i = 0; i < 40; i += 1) { scene.time.now += 50; system.update(.05); }
  assert.equal(bat.getData('flightY'), 63);
  assert.equal(system.isClearAt(bat.x, bat.getData('flightY')), true);
});

test('contact while jumping into a bat requests exactly one heart of damage', () => {
  const { scene, system, bat, damage } = setup();
  scene.player.x = bat.x;
  Object.assign(scene.player.body, { x: bat.x - 15, y: bat.y - 10, height: 30, bottom: bat.y + 20 });
  system.updateBat(bat, 0);
  assert.deepEqual(damage, [1]);
});

test('berry drop has a visible warning before becoming a damaging projectile', () => {
  const { scene, system, bat } = setup();
  scene.player.x = bat.x;
  bat.setData('speed', 0); bat.setData('nextDropAt', 0);
  system.updateBat(bat, 0);
  const preview = bat.getData('chargeVisual');
  assert.equal(preview.active, true);
  assert.equal(system.berries.getChildren().length, 0);
  scene.time.now += 449; system.updateBat(bat, 0);
  assert.equal(system.berries.getChildren().length, 0);
  scene.time.now += 1; system.updateBat(bat, 0);
  assert.equal(preview.active, false);
  assert.equal(system.berries.getChildren().length, 1);
});

test('a berry hitting the player requests two damage and disappears exactly once', () => {
  const { scene, system, bat, damage, splashes } = setup();
  scene.player.x = bat.x;
  scene.player.body.x = bat.x - 15;
  const berry = system.dropBerry(bat);
  for (let i = 0; i < 30 && berry.active; i += 1) system.updateBerry(berry, .05);
  assert.deepEqual(damage, [2]);
  assert.equal(berry.active, false);
  assert.equal(system.berries.getChildren().length, 0);
  system.updateBerry(berry, .05);
  assert.deepEqual(damage, [2]);
  assert.equal(splashes.length, 1);
});

test('a missed berry bursts on the floor without leaving a damaging puddle', () => {
  const { system, bat, damage, splashes, tweens } = setup();
  const berry = system.dropBerry(bat);
  for (let i = 0; i < 40 && berry.active; i += 1) system.updateBerry(berry, .05);
  assert.equal(berry.active, false);
  assert.deepEqual(damage, []);
  assert.equal(splashes.length, 1);
  assert.equal(splashes[0].y, 600);
  tweens[0].onComplete();
  assert.equal(splashes[0].active, false);
});

test('platforms catch poison berries before they can hit a player underneath', () => {
  const { scene, system, bat, damage, splashes } = setup();
  scene.player.x = bat.x; scene.player.body.x = bat.x - 15;
  scene.blockMap.set('10,8', { active: true });
  const berry = system.dropBerry(bat);
  for (let i = 0; i < 30 && berry.active; i += 1) system.updateBerry(berry, .05);
  assert.deepEqual(damage, []);
  assert.equal(splashes[0].y, 320);
});

test('swept berry movement detects even a thin target at high speed', () => {
  const { scene, system, bat, damage } = setup();
  scene.player.x = bat.x;
  Object.assign(scene.player.body, { x: bat.x - 15, y: 260, height: 2, bottom: 262 });
  const berry = system.dropBerry(bat); berry.setData('velocityY', 2500);
  system.updateBerry(berry, .05);
  assert.deepEqual(damage, [2]);
  assert.equal(berry.active, false);
});

test('hitting a bat cancels its pending drop and briefly stuns it; a second hit defeats it', () => {
  const { scene, system, bat } = setup();
  system.startCharge(bat);
  const preview = bat.getData('chargeVisual');
  const x = bat.x;
  system.damage(bat, 1);
  assert.equal(preview.active, false);
  assert.equal(bat.getData('chargeUntil'), 0);
  scene.time.now += 200; system.update(.05);
  assert.equal(bat.x, x);
  assert.equal(system.berries.getChildren().length, 0);
  system.damage(bat, 1);
  assert.equal(bat.active, false);
  assert.equal(system.group.getChildren().length, 0);
});

test('pause freezes flights and berries, and leaving the level clears pending projectiles', () => {
  const { scene, system, bat } = setup();
  system.startCharge(bat);
  const preview = bat.getData('chargeVisual');
  const berry = system.dropBerry(bat), x = bat.x, y = berry.y;
  scene.isPaused = true; scene.time.now += 1000; system.update(.05);
  assert.equal(bat.x, x); assert.equal(berry.y, y);
  system.destroy();
  assert.equal(bat.active, false);
  assert.equal(berry.active, false);
  assert.equal(preview.active, false);
});

test('closing the boss arena removes bats and berries behind its wall', () => {
  const { system, bat } = setup();
  system.startCharge(bat); const preview = bat.getData('chargeVisual');
  const berry = system.dropBerry(bat);
  system.removeBefore(1000);
  assert.equal(bat.active, false);
  assert.equal(berry.active, false);
  assert.equal(preview.active, false);
});
