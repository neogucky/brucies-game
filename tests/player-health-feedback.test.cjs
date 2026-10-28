const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');

const src = file => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
const Feedback = vm.runInNewContext(src('utils/PlayerHealthFeedback.js')
  .replace('export default class PlayerHealthFeedback', 'class PlayerHealthFeedback') + '\nPlayerHealthFeedback;');

function setup(health = 5) {
  const played = [], beeps = [];
  const scene = {
    health, events: new EventEmitter(), player: { active: true }, time: {},
    physics: { world: {} },
    hud: { hearts: Array.from({ length: 5 }, () => ({ alpha: 1, setAlpha(value) { this.alpha = value; } })) },
    sound: {
      play(key) { played.push(key); },
      add(key) {
        const sound = { key, isPlaying: false, stops: 0, destroyed: false,
          play() { this.isPlaying = true; beeps.push(key); },
          stop() { this.isPlaying = false; this.stops++; },
          destroy() { this.destroyed = true; },
        };
        scene.beep = sound; return sound;
      },
    },
  };
  return { scene, feedback: new Feedback(scene), played, beeps };
}

test('each real player hit has its own sound, including a fatal hit before health is reset', () => {
  const { scene, feedback, played } = setup();
  scene.events.emit('player-hurt', { amount: 3, health: 2 });
  scene.events.emit('player-hurt', { amount: 2, health: 0 });
  scene.health = 5; scene.isGameOver = true; feedback.update(16);
  assert.deepEqual(played, ['sfx-player-hurt', 'sfx-player-hurt']);
});

test('the last full heart pulses with the monitor while empty hearts stay still', () => {
  const { scene, feedback, beeps } = setup(1);
  feedback.update();
  assert.deepEqual(beeps, ['sfx-low-health']);
  for (let i = 0; i < 3; i++) feedback.update(200);
  assert.ok(scene.hud.hearts[0].alpha <= .26);
  assert.ok(scene.hud.hearts.slice(1).every(heart => heart.alpha === 1));
  for (let i = 0; i < 3; i++) feedback.update(200);
  assert.equal(beeps.length, 2);
  assert.equal(scene.hud.hearts[0].alpha, 1);
});

test('healing stops the beep and restores heart opacity immediately on the next frame', () => {
  const { scene, feedback, beeps } = setup(1);
  feedback.update(); feedback.update(250);
  assert.ok(scene.hud.hearts[0].alpha < 1);
  scene.health = 2; feedback.update();
  assert.equal(scene.hud.hearts[0].alpha, 1);
  assert.equal(scene.beep.isPlaying, false);
  for (let i = 0; i < 50; i++) feedback.update(100);
  assert.equal(beeps.length, 1);
});

for (const flag of ['isPaused', 'inventoryOpen', 'isGameOver', 'isComplete', 'levelCompleted', 'isEditorMode', 'isHitboxEditMode']) {
  test(flag + ' silences the warning and stops blinking', () => {
    const { scene, feedback, beeps } = setup(1);
    feedback.update(); feedback.update(250);
    scene[flag] = true; feedback.update();
    assert.equal(scene.beep.isPlaying, false);
    assert.equal(scene.hud.hearts[0].alpha, 1);
    assert.equal(beeps.length, 1);
  });
}

test('scene pause stops the warning even when that scene no longer receives updates', () => {
  const { scene, feedback, beeps } = setup(1);
  feedback.update(); feedback.update(250);
  scene.events.emit('pause');
  assert.equal(scene.hud.hearts[0].alpha, 1);
  assert.equal(scene.beep.isPlaying, false);
  feedback.update();
  assert.equal(beeps.length, 2);
});

test('dialogue, exit confirmation, loading and paused physics do not beep', () => {
  for (const props of [
    { dialog: { container: { visible: true } } }, { confirmation: { isOpen: true } },
    { startScreen: { active: true } }, { time: { paused: true } }, { physics: { world: { isPaused: true } } },
  ]) {
    const { scene, feedback, beeps } = setup(1); Object.assign(scene, props);
    feedback.update(); assert.deepEqual(beeps, []);
  }
});

test('destroying the feedback removes listeners and sounds before a restart', () => {
  const { scene, feedback, played, beeps } = setup(1);
  feedback.update(); feedback.update(250); const oldBeep = scene.beep;
  feedback.destroy();
  assert.equal(scene.hud.hearts[0].alpha, 1);
  assert.equal(oldBeep.isPlaying, false); assert.equal(oldBeep.destroyed, true);
  assert.equal(scene.events.listenerCount('player-hurt'), 0);
  assert.equal(scene.events.listenerCount('pause'), 0);
  const replacement = new Feedback(scene);
  scene.events.emit('player-hurt', { amount: 1, health: 1 }); replacement.update();
  assert.equal(played.length, 1); assert.equal(beeps.length, 2);
  replacement.destroy();
});

function damageScene(name, file) {
  const context = { Phaser: { Scene: class {} } };
  vm.createContext(context);
  vm.runInContext(src(file).replace(/^import [\s\S]*?;\n/gm, '')
    .replace('export default class ' + name, 'globalThis.Scene = class ' + name), context);
  const { scene, ...rest } = setup();
  Object.setPrototypeOf(scene, context.Scene.prototype);
  const data = {};
  Object.assign(scene, {
    time: { now: 1000 }, worldTime: 1000, invulnerableUntil: 0,
    shield: { tryBlockHit: () => false },
    player: { active: true, getData: key => data[key], setData: (key, value) => { data[key] = value; } },
    updateHearts() {}, flashDamage() {}, saveInventory() {}, saveState() {},
    cameras: { main: { shake() {} } },
    finish() { this.isGameOver = true; this.health = 5; }, gameOver() { this.isGameOver = true; },
  });
  scene.hud.setHealth = () => {};
  return { scene, ...rest };
}

for (const [name, file, method] of [
  ...['DesertRuinScene', 'DesertEndlessScene', 'DesertTunnelScene'].map(name => [name, 'scenes/desert/' + name + '.js', 'damagePlayer']),
  ['JungleScene', 'scenes/jungle/JungleScene.js', 'takeJungleHit'],
]) {
  test(name + ': simultaneous attacks play one hurt sound and remove health once', () => {
    const { scene, played } = damageScene(name, file);
    scene[method](1); scene[method](2);
    assert.equal(scene.health, 4); assert.deepEqual(played, ['sfx-player-hurt']);
    scene.time.now += 1600; scene.worldTime += 1600; scene[method](1);
    assert.equal(scene.health, 3); assert.equal(played.length, 2);
  });
  test(name + ': a shield hit never plays the player hurt sound', () => {
    const { scene, played } = damageScene(name, file);
    scene.shield.tryBlockHit = () => true; scene[method](2);
    assert.equal(scene.health, 5); assert.deepEqual(played, []);
  });
}

test('a lethal jungle hit still plays the hurt sound when defeat immediately refills health', () => {
  const { scene, played } = damageScene('JungleScene', 'scenes/jungle/JungleScene.js');
  scene.health = 1; scene.takeJungleHit(3);
  assert.equal(scene.health, 5); assert.equal(scene.isGameOver, true);
  assert.deepEqual(played, ['sfx-player-hurt']);
});
