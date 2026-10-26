const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const path = require('node:path');
const { EventEmitter } = require('node:events');

class Rectangle {
  constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); }
  get right() { return this.x + this.width; }
  get bottom() { return this.y + this.height; }
  setPosition(x, y) { this.x = x - this.width / 2; this.y = y - this.height / 2; return this; }
  getBounds() { return this; }
  setVisible() { return this; }
  setSize(width, height) { this.width = width; this.height = height; return this; }
}
const context = {
  saveProgress: data => { context.lastSaved = data; },
  Phaser: {
    Scene: class {},
    Math: {
      Clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
      RND: { pick: values => values[0] },
      Vector2: class { constructor(x, y) { this.set(x, y); } set(x, y) { this.x = x; this.y = y; } },
      Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) },
    },
    Geom: { Rectangle, Intersects: { RectangleToRectangle: (a, b) =>
      a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y } },
  },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/utils/undergroundBoss.js'), 'utf8')
  .replace(/export /g, ''), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/utils/inventory.js'), 'utf8')
  .replace(/export /g, ''), context);
context.showUndergroundVictory = (scene, options) => { context.victory = options; return {}; };
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/utils/ShieldManager.js'), 'utf8')
  .replace('export default class ShieldManager', 'globalThis.ShieldManager = class ShieldManager'), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/utils/weapons.js'), 'utf8')
  .replace(/export /g, ''), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/utils/DesertMoleAI.js'), 'utf8')
  .replace('export default class DesertMoleAI', 'globalThis.DesertMoleAI = class DesertMoleAI'), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/scenes/underground/UndergroundDigScene.js'), 'utf8')
  .replace(/^import .*;\n/gm, '')
  .replace('export default class UndergroundDigScene', 'globalThis.Scene = class UndergroundDigScene'), context);

function actor(x = 400, y = 100, data = {}) {
  return {
    active: true, x, y, angle: 0, data, displayHeight: 80,
    texture: { key: 'running' },
    visible: true,
    body: {
      enable: true, blocked: { down: true }, velocity: { x: 0, y: 0 },
      setVelocity(x, y) { this.velocity = { x, y }; },
      setVelocityX(x) { this.velocity.x = x; }, setVelocityY(y) { this.velocity.y = y; },
      setEnable(value) { this.enable = value; },
    },
    getData(key) { return this.data[key]; },
    setData(key, value) { this.data[key] = value; return this; },
    setTexture(value) { this.texture = { key: value }; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setTint(value) { this.tint = value; return this; },
    setFlipX() {},
    setVisible(value) { this.visible = value; return this; },
    getBounds() { return new Rectangle(this.x - 15, this.y - 40, 30, 40); },
    destroy() { this.active = false; },
  };
}
function setup(data = {}) {
  const scene = Object.create(context.Scene.prototype);
  const monster = actor(400, 100, { stoneState: 'rolling', rollDir: 1, rollStartX: 400, ...data });
  Object.assign(scene, {
    tileSize: 40, gridCols: 1000, gridRows: 100,
    timers: [],
    time: { now: 0, delayedCall(delay, callback) {
      const timer = { at: scene.time.now + delay, callback, removed: false, remove() { this.removed = true; } };
      scene.timers.push(timer);
      return timer;
    } }, game: { loop: { delta: 50 } },
    health: 5, maxHealth: 5, isGameOver: false, saves: 0, sounds: 0,
    blockMap: new Map(), blocks: { remove() {} },
    player: actor(4000, 100),
    stoneMonstersGroup: { getChildren: () => [monster] },
    moleAIs: new Map(), molesGroup: { getChildren: () => [] },
    tweens: { add(config) { this.pending = config; }, killTweensOf() { this.killed = true; } },
    hud: { setHealth(health) { this.health = health; }, setCompanionStatus(value) { this.companion = value; } },
    saveInventory() { this.saves += 1; },
    triggerGameOver() { this.isGameOver = true; },
    playStoneMonsterHitSound() { this.sounds += 1; },
    setStoneMonsterRollingSound() {}, shakeCameraBurst() {},
  });
  scene.player.body = { x: 3990, y: 80, width: 20, height: 40 };
  return { scene, monster };
}

function advance(scene, now) {
  scene.time.now = now;
  for (const timer of scene.timers) {
    if (!timer.removed && timer.at <= now) { timer.removed = true; timer.callback(); }
  }
}

function withSword(scene) {
  scene.facingX = 1;
  scene.equipped = { weapon: 'sword' };
  scene.cursors = { up: { isDown: false } };
  scene.wasd = { W: { isDown: false } };
  scene.swordHitbox = new Rectangle(0, 0, 48, 38);
  scene.player.x = 400;
  scene.player.y = 160;
  scene.player.body = { x: 385, y: 80, width: 30, height: 80 };
  scene.updateSwordHitbox();
}

function withMole(scene, options = {}) {
  const mole = actor(440, 160, { hp: 3, maxHp: 3, moleActive: true });
  scene.molesGroup = { getChildren: () => [mole], children: {} };
  scene.blockMap.set('11,4', actor());
  const ai = new context.DesertMoleAI(scene, mole, {
    tileSize: 40, blockMap: scene.blockMap,
    attackRange: 45, chargeMs: 200, attackCooldownMs: 800,
    canSeePlayer: () => true,
    getPlayerPos: () => ({ x: 400, y: 160 }),
    onAttack: () => scene.applyMoleAttack(mole), ...options,
  });
  scene.moleAIs.set(mole, ai);
  return { mole, ai };
}

function withShield(scene, owned = true) {
  scene.add = { circle() { return {
    scene, active: true, geom: {}, visible: true,
    setDepth() { return this; }, setRadius() { return this; }, setPosition() { return this; },
    setVisible(value) { this.visible = value; return this; },
  }; } };
  Object.assign(scene.hud, {
    setPassiveOwned(value) { this.passiveOwned = value; },
    setPassiveCooldown(value) { this.passiveCooldown = value; },
    flashItem(slot) { this.flashedSlot = slot; },
  });
  scene.shield = new context.ShieldManager(scene);
  scene.shield.initFromSave({ equipment: { shield: owned } });
  scene.shield.attach(scene.player);
  scene.shield.setHud(scene.hud);
  return scene.shield;
}

for (const isBoss of [false, true]) {
  for (const state of ['rolling', 'dropping']) {
    test(`active shield blocks ${isBoss ? 'boss' : 'regular'} ${state} impact without losing hearts`, () => {
      const { scene, monster } = setup({ stoneState: state, isStoneBoss: isBoss });
      const shield = withShield(scene);
      scene.time.now = 1000;
      scene.player.body.x = 390;
      scene.player.body.height = 200;
      if (state === 'rolling') scene.updateStoneMonsterRoll(monster, .05);
      else scene.updateStoneMonsterDrop(monster, .05);
      assert.equal(scene.health, 5);
      assert.equal(scene.saves, 0);
      assert.equal(scene.isGameOver, false);
      assert.equal(shield.active, false);
      assert.equal(shield.bubble.visible, false);
      assert.equal(shield.cooldownUntil, 21000);
      assert.equal(scene.hud.passiveCooldown.active, false);
      assert.equal(scene.hud.flashedSlot, 'passive');
      assert.equal(scene.player.getData('stoneInvulnerableUntil'), 2500);
      assert.equal(monster.getData('stoneState'), state === 'rolling' ? 'stunned' : 'dropping');
    });
  }
}

test('a shield block prevents immediate follow-up stone damage, then damage resumes during recharge', () => {
  const { scene, monster } = setup();
  const shield = withShield(scene);
  scene.time.now = 1000;
  scene.applyStoneMonsterPlayerHit(monster);
  const nextStone = actor(400, 100, { stoneState: 'rolling' });
  scene.time.now = 2499;
  scene.applyStoneMonsterPlayerHit(nextStone, 1, false);
  assert.equal(scene.health, 5);
  scene.time.now = 2500;
  scene.applyStoneMonsterPlayerHit(nextStone, 1, false);
  assert.equal(scene.health, 4);
  assert.equal(shield.active, false);
  assert.equal(shield.cooldownUntil, 21000);
  scene.time.now = 20999; shield.update();
  assert.equal(shield.active, false);
  scene.time.now = 21000; shield.update();
  assert.equal(shield.active, true);
  assert.equal(shield.bubble.visible, true);
  scene.applyStoneMonsterPlayerHit(nextStone, 1, false);
  assert.equal(scene.health, 4);
  assert.equal(shield.active, false);
});

for (const protection of ['invulnerableUntil', 'stoneInvulnerableUntil']) {
  test(`existing ${protection} does not consume a ready shield`, () => {
    const { scene, monster } = setup();
    const shield = withShield(scene);
    scene.player.setData(protection, 2000);
    scene.time.now = 1000;
    scene.applyStoneMonsterPlayerHit(monster);
    assert.equal(scene.health, 5);
    assert.equal(shield.active, true);
    assert.equal(shield.bubble.visible, true);
    assert.equal(shield.cooldownUntil, 0);
  });
}

test('owning no shield still allows normal stone damage', () => {
  const { scene, monster } = setup();
  const shield = withShield(scene, false);
  scene.applyStoneMonsterPlayerHit(monster);
  assert.equal(scene.health, 4);
  assert.equal(shield.active, false);
  assert.equal(shield.cooldownUntil, 0);
});

test('a normal underground enemy consumes the shield without damaging the player', () => {
  const { scene } = setup();
  withSword(scene);
  const { mole } = withMole(scene);
  const shield = withShield(scene);
  scene.time.now = 1000;
  scene.applyMoleAttack(mole);
  assert.equal(scene.health, 5);
  assert.equal(shield.active, false);
  assert.equal(shield.bubble.visible, false);
  assert.equal(shield.cooldownUntil, 21000);
});

test('regular rolling hit costs one heart, updates HUD/save, and stuns', () => {
  const { scene, monster } = setup();
  scene.player.body.x = 400;
  scene.updateStoneMonsterRoll(monster, 0.05);
  assert.equal(scene.health, 4);
  assert.equal(scene.hud.health, 4);
  assert.equal(scene.saves, 1);
  assert.equal(monster.getData('stoneState'), 'stunned');
  assert.equal(scene.isGameOver, false);
});

test('regular falling hit costs one heart and is applied once during a fall', () => {
  const { scene, monster } = setup({ stoneState: 'dropping' });
  scene.player.body.x = 390;
  scene.player.body.height = 200;
  scene.updateStoneMonsterDrop(monster, 0.05);
  assert.equal(scene.health, 4);
  assert.equal(monster.getData('fallHitDone'), true);
  scene.time.now = 2000;
  scene.updateStoneMonsterDrop(monster, 0.05);
  assert.equal(scene.health, 4);
});

test('falling then rolling hits and multiple stones share a 1.5s protection window', () => {
  const { scene, monster } = setup();
  scene.applyStoneMonsterPlayerHit(monster, 1, false);
  scene.time.now = 100;
  scene.applyStoneMonsterPlayerHit(monster);
  const another = actor(420, 100);
  scene.time.now = 1499;
  scene.applyStoneMonsterPlayerHit(another);
  assert.equal(scene.health, 4);
  assert.equal(scene.saves, 1);
  assert.equal(scene.sounds, 1);
  assert.equal(another.getData('stoneState'), 'stunned');
  scene.time.now = 1500;
  another.setData('stoneState', 'rolling');
  scene.applyStoneMonsterPlayerHit(another);
  assert.equal(scene.health, 3);
  assert.equal(scene.saves, 2);
});

for (const dir of [-1, 1]) {
  test(`roll stops at exactly ten tiles with player still ahead (direction ${dir})`, () => {
    const { scene, monster } = setup({ rollDir: dir, rollStartX: 800 });
    monster.x = 800;
    scene.player.x = dir > 0 ? 4000 : -4000;
    scene.player.body.x = scene.player.x;
    for (let frame = 0; frame < 100 && monster.getData('stoneState') === 'rolling'; frame += 1) {
      scene.updateStoneMonsterRoll(monster, 0.05);
    }
    assert.equal(monster.x, 800 + dir * 400);
    assert.equal(monster.getData('rollStartX'), 800);
    assert.equal(monster.getData('stoneState'), 'stunned');
  });
}

test('hit at the last step of the roll is still detected', () => {
  const { scene, monster } = setup();
  monster.x = 799;
  scene.player.body.x = 810;
  scene.updateStoneMonsterRoll(monster, 0.05);
  assert.equal(monster.x, 800);
  assert.equal(scene.health, 4);
});

test('after reaching range limit, enemy pauses before another bounded attack', () => {
  const { scene, monster } = setup();
  monster.x = 799;
  scene.updateStoneMonsterRoll(monster, 0.05);
  scene.time.now = 999;
  scene.updateStoneMonsters();
  assert.equal(monster.getData('stoneState'), 'stunned');
  assert.equal(monster.x, 800);
  scene.time.now = 1000;
  scene.updateStoneMonsters();
  assert.equal(monster.getData('stoneState'), 'rolling');
  assert.equal(monster.getData('rollStartX'), 800);
  for (let i = 0; i < 35; i += 1) scene.updateStoneMonsters();
  assert.equal(monster.x, 1200);
  assert.equal(monster.getData('stoneState'), 'stunned');
});

test('wall collisions still interrupt a regular roll and prepare reverse direction', () => {
  const { scene, monster } = setup();
  scene.blockMap.set('10,2', actor(420, 100, { type: 'black' }));
  scene.updateStoneMonsterRoll(monster, 0.05);
  assert.equal(monster.getData('stoneState'), 'stunned');
  assert.equal(monster.getData('pendingRollDir'), -1);
});

test('boss keeps rolling distance and two rolling damage, but falling damage is three', () => {
  const { scene, monster } = setup({ isStoneBoss: true });
  for (let i = 0; i < 60; i += 1) scene.updateStoneMonsterRoll(monster, 0.05);
  assert.ok(monster.x > 800);
  assert.equal(monster.getData('stoneState'), 'rolling');
  scene.player.body.x = monster.x;
  scene.updateStoneMonsterRoll(monster, 0.05);
  assert.equal(scene.health, 3);
  const falling = setup({ isStoneBoss: true, stoneState: 'dropping' });
  falling.scene.player.body.x = 390;
  falling.scene.player.body.height = 200;
  falling.scene.updateStoneMonsterDrop(falling.monster, 0.05);
  assert.equal(falling.scene.health, 2);
});

test('one heart remaining can still be lost; game-over prevents further damage', () => {
  const { scene, monster } = setup();
  scene.health = 1;
  scene.applyStoneMonsterPlayerHit(monster);
  assert.equal(scene.health, 0);
  assert.equal(scene.isGameOver, true);
  scene.time.now = 2000;
  scene.applyStoneMonsterPlayerHit(monster);
  assert.equal(scene.saves, 1);
});

test('inactive monsters and players cannot cause damage', () => {
  const { scene, monster } = setup();
  monster.active = false;
  scene.applyStoneMonsterPlayerHit(monster);
  monster.active = true;
  scene.player.active = false;
  scene.applyStoneMonsterPlayerHit(monster);
  assert.equal(scene.health, 5);
  assert.equal(scene.saves, 0);
});

test('sword reaches 48px in front after the 20% reduction, also when crouching', () => {
  const { scene } = setup();
  withSword(scene);
  for (const facing of [-1, 1]) {
    for (const crouching of [false, true]) {
      scene.facingX = facing;
      scene.isDucking = crouching;
      scene.updateSwordHitbox();
      const box = scene.swordHitbox.getBounds();
      assert.equal(facing > 0 ? box.right : box.x, scene.player.x + facing * 48);
      assert.ok(box.x <= scene.player.x && box.right >= scene.player.x);
    }
  }
});

test('one swing can damage an enemy only once, with a new swing after 140ms', () => {
  const { scene, monster } = setup({ hp: 5 });
  withSword(scene);
  monster.x = 455;
  monster.y = 105;
  scene.digBlock();
  scene.digBlock();
  assert.equal(monster.getData('hp'), 4);
  advance(scene, 139);
  scene.digBlock();
  assert.equal(monster.getData('hp'), 4);
  advance(scene, 140);
  scene.digBlock();
  assert.equal(monster.getData('hp'), 3);
  assert.equal(monster.getData('stateUntil'), 640);
});

test('an enemy entering reach during the swing is hit once and immediately stunned', () => {
  const { scene, monster } = setup({ hp: 5 });
  withSword(scene);
  monster.x = 480;
  monster.y = 105;
  scene.digBlock();
  assert.equal(monster.getData('hp'), 5);
  advance(scene, 60);
  monster.x = 460;
  scene.hitSwordEnemies();
  assert.equal(monster.getData('hp'), 4);
  assert.equal(monster.getData('stoneState'), 'stunned');
  advance(scene, 100);
  scene.hitSwordEnemies();
  assert.equal(monster.getData('hp'), 4);
  advance(scene, 140);
  const lateEnemy = actor(455, 105, { hp: 5 });
  scene.stoneMonstersGroup = { getChildren: () => [lateEnemy] };
  scene.hitSwordEnemies();
  assert.equal(lateEnemy.getData('hp'), 5);
});

test('a swing does not hit enemies behind the player', () => {
  const { scene, monster } = setup({ hp: 5 });
  withSword(scene);
  monster.x = 360;
  monster.y = 105;
  scene.digBlock();
  assert.equal(monster.getData('hp'), 5);
});

test('all enemies caught by one swing are stunned without skipping a killed enemy neighbor', () => {
  const { scene, monster } = setup({ hp: 5 });
  withSword(scene);
  monster.x = 455;
  monster.y = 105;
  const { mole } = withMole(scene);
  mole.setData('hp', 1);
  const another = actor(440, 160, { hp: 3 });
  scene.molesGroup = { getChildren: () => moles };
  const moles = [mole, another];
  scene.moleAIs.set(another, { stun: () => another.setData('stunned', true) });
  scene.destroyMole = enemy => { enemy.destroy(); moles.splice(moles.indexOf(enemy), 1); };
  scene.digBlock();
  assert.equal(mole.active, false);
  assert.equal(another.getData('hp'), 2);
  assert.equal(another.getData('stunned'), true);
  assert.equal(monster.getData('stoneState'), 'stunned');
});

for (const gap of [150, 250, 400]) {
  test(`repeated sword hits every ${gap}ms keep a rolling stone stunned until defeat`, () => {
    const { scene, monster } = setup({ hp: 5 });
    withSword(scene);
    monster.x = 455;
    monster.y = 105;
    for (let hit = 0; hit < 5; hit += 1) {
      advance(scene, hit * gap);
      scene.digBlock();
      if (!monster.active) break;
      assert.equal(monster.getData('stoneState'), 'stunned');
      advance(scene, (hit + 1) * gap - 1);
      scene.updateStoneMonsters();
      scene.applyStoneMonsterPlayerHit(monster);
      assert.equal(monster.x, 455);
      assert.equal(scene.health, 5);
    }
    assert.equal(monster.active, false);
    assert.equal(scene.health, 5);
  });
}

test('stone can attack again after the player stops striking', () => {
  const { scene, monster } = setup({ hp: 5 });
  scene.damageStoneMonster(monster, 1);
  scene.time.now = 499;
  scene.updateStoneMonsters();
  assert.equal(monster.getData('stoneState'), 'stunned');
  scene.time.now = 500;
  scene.updateStoneMonsters();
  assert.equal(monster.getData('stoneState'), 'rolling');
});

test('hitting a wobbling stone cancels its drop callback and preserves the perch', () => {
  const { scene, monster } = setup({ hp: 5, stoneState: 'perched' });
  scene.startStoneMonsterDrop(monster);
  const callback = scene.tweens.pending.onComplete;
  scene.time.now = 100;
  scene.damageStoneMonster(monster, 1);
  assert.equal(scene.tweens.killed, true);
  callback();
  assert.equal(monster.getData('stoneState'), 'stunned');
  scene.time.now = 600;
  scene.updateStoneMonsters();
  assert.equal(monster.getData('stoneState'), 'perched');
});

test('a falling stone freezes during repeated hit-stuns, then resumes falling', () => {
  const { scene, monster } = setup({ hp: 5, stoneState: 'dropping' });
  scene.damageStoneMonster(monster, 1);
  scene.time.now = 400;
  scene.damageStoneMonster(monster, 1);
  scene.time.now = 899;
  scene.updateStoneMonsters();
  assert.equal(monster.y, 100);
  assert.equal(monster.getData('stoneState'), 'stunned');
  scene.time.now = 900;
  scene.updateStoneMonsters();
  assert.equal(monster.getData('stoneState'), 'dropping');
  scene.updateStoneMonsters();
  assert.ok(monster.y > 100);
});

test('hitting an already stunned stone does not shorten its existing stun', () => {
  const { scene, monster } = setup({ hp: 5 });
  scene.stunStoneMonster(monster);
  scene.time.now = 100;
  scene.damageStoneMonster(monster, 1);
  assert.equal(monster.getData('stateUntil'), 1000);
});

test('a sword hit cancels an already charging mole attack, including stale attack calls', () => {
  const { scene } = setup();
  withSword(scene);
  const { mole, ai } = withMole(scene);
  advance(scene, 1000);
  ai.tryAttack(scene.time.now);
  assert.equal(ai.pendingAttack, true);
  advance(scene, 1199);
  scene.digBlock();
  assert.equal(mole.getData('hp'), 2);
  assert.equal(ai.pendingAttack, false);
  assert.equal(ai.chargeUntil, 0);
  assert.equal(mole.texture.key, 'desert-mole-stunned');
  advance(scene, 1201);
  ai.updateCharge(scene.time.now);
  ai.executeAttack(scene.time.now);
  scene.applyMoleAttack(mole);
  assert.equal(scene.health, 5);
});

for (const gap of [150, 250, 400]) {
  test(`repeated sword hits every ${gap}ms keep a mole stunned until defeat`, () => {
    const { scene } = setup();
    withSword(scene);
    const { mole, ai } = withMole(scene);
    for (let hit = 0; hit < 3; hit += 1) {
      advance(scene, 1000 + hit * gap);
      scene.digBlock();
      if (!mole.active) break;
      advance(scene, 1000 + (hit + 1) * gap - 1);
      ai.update(scene.time.now, 16);
      scene.applyMoleAttack(mole);
      assert.equal(mole.x, 440);
      assert.equal(mole.y, 160);
      assert.equal(ai.pendingAttack, false);
      assert.equal(scene.health, 5);
    }
    assert.equal(mole.active, false);
    assert.equal(scene.health, 5);
  });
}

test('after stun ends, the mole charges a fresh attack instead of releasing the cancelled one', () => {
  const { scene } = setup();
  withSword(scene);
  const { mole, ai } = withMole(scene);
  scene.time.now = 1000;
  ai.tryAttack(1000);
  scene.time.now = 1199;
  scene.damageMole(mole, 1);
  scene.time.now = 1698;
  ai.update(1698, 16);
  assert.equal(ai.pendingAttack, false);
  scene.time.now = 1800;
  ai.update(1800, 16);
  assert.equal(ai.pendingAttack, true);
  assert.equal(ai.chargeUntil, 2000);
  assert.equal(scene.health, 5);
  scene.time.now = 2000;
  ai.update(2000, 16);
  assert.equal(scene.health, 4);
});

for (const dir of [-1, 1]) {
  test(`rolling stone visibly rotates in travel direction ${dir} and becomes upright when stunned`, () => {
    const { scene, monster } = setup({ rollDir: dir });
    scene.updateStoneMonsterRoll(monster, 0.05);
    assert.ok(monster.angle * dir > 0);
    scene.stunStoneMonster(monster);
    assert.equal(monster.angle, 0);
  });
}

for (const state of ['rolling', 'dropping']) {
  test(`${state} stone damages and stuns a mole, then stops without repeated frame damage`, () => {
    const { scene, monster } = setup({ stoneState: state });
    const { mole } = withMole(scene);
    mole.x = state === 'rolling' ? 440 : 400;
    mole.y = state === 'rolling' ? 140 : 170;
    if (state === 'rolling') scene.updateStoneMonsterRoll(monster, 0.05);
    else scene.updateStoneMonsterDrop(monster, 0.05);
    assert.equal(mole.getData('hp'), 1);
    assert.equal(monster.getData('stoneState'), 'stunned');
    assert.equal(mole.getData('stunnedUntil'), 500);
    assert.equal(scene.hitStoneMonsterMoles(monster), false);
    assert.equal(mole.getData('hp'), 1);
    assert.equal(scene.health, 5);
  });
}

test('stone collisions cannot damage distant or inactive moles', () => {
  const { scene, monster } = setup();
  const { mole } = withMole(scene);
  const previousBounds = scene.getStoneMonsterHitbox(monster);
  monster.x += 10;
  mole.x = 1000;
  assert.equal(scene.hitStoneMonsterMoles(monster, previousBounds), false);
  mole.x = monster.x;
  mole.active = false;
  assert.equal(scene.hitStoneMonsterMoles(monster, previousBounds), false);
  assert.equal(mole.getData('hp'), 3);
});

for (const dir of [-1, 1]) {
  test(`rolling out of an existing overlap does not hurt the mole or stop the stone (${dir})`, () => {
    const { scene, monster } = setup({ rollDir: dir });
    const { mole } = withMole(scene);
    mole.x = monster.x; mole.y = 140;
    for (let frame = 0; frame < 8; frame += 1) scene.updateStoneMonsterRoll(monster, 0.05);
    assert.equal(mole.getData('hp'), 3);
    assert.equal(monster.getData('stoneState'), 'rolling');
    // Once separated, a new impact in the opposite direction is valid.
    monster.setData('rollDir', -dir);
    monster.setData('rollStartX', monster.x);
    for (let frame = 0; frame < 8 && monster.getData('stoneState') === 'rolling'; frame += 1) {
      scene.updateStoneMonsterRoll(monster, 0.05);
    }
    assert.equal(mole.getData('hp'), 1);
    assert.equal(monster.getData('stoneState'), 'stunned');
  });
}

test('dropping out of an existing overlap does not damage or stop', () => {
  const { scene, monster } = setup({ stoneState: 'dropping' });
  const { mole } = withMole(scene); mole.x = 400; mole.y = 140;
  for (let frame = 0; frame < 4; frame += 1) scene.updateStoneMonsterDrop(monster, 0.05);
  assert.equal(mole.getData('hp'), 3);
  assert.equal(monster.getData('stoneState'), 'dropping');
});

test('resuming a roll inside the previously hit mole does not hit or stop again', () => {
  const { scene, monster } = setup();
  const { mole } = withMole(scene); mole.y = 140;
  scene.updateStoneMonsterRoll(monster, 0.05);
  assert.equal(mole.getData('hp'), 1);
  scene.resumeStoneMonsterRoll(monster);
  scene.updateStoneMonsterRoll(monster, 0.05);
  assert.equal(mole.getData('hp'), 1);
  assert.equal(monster.getData('stoneState'), 'rolling');
});

test('a stationary overlapping stone cannot hurt a mole', () => {
  const { scene, monster } = setup();
  const { mole } = withMole(scene); mole.x = 400; mole.y = 140;
  scene.updateStoneMonsterRoll(monster, 0);
  assert.equal(mole.getData('hp'), 3);
  assert.equal(monster.getData('stoneState'), 'rolling');
});

function withCompanion(scene) {
  scene.companion = actor(425, 160);
  scene.player.x = 400;
  scene.player.y = 160;
  scene.companionHealth = 1;
  scene.companionEnabled = true;
  scene.companionRespawnAt = 0;
  scene.companionMode = 'hop';
  scene.helperInvulnDuration = 1000;
  scene.hasLineOfSight = () => true;
}

test('helper attacks and stuns a nearby mole, with animation and cooldown', () => {
  const { scene, monster } = setup();
  monster.active = false;
  const { mole } = withMole(scene);
  withCompanion(scene);
  assert.equal(scene.updateCompanionAttack(), true);
  assert.equal(mole.getData('hp'), 2);
  assert.equal(mole.getData('stunnedUntil'), 500);
  assert.equal(scene.companion.texture.key, 'companion-attacking');
  assert.equal(scene.companion.getData('invulnerableUntil'), 300);
  scene.time.now = 200;
  assert.equal(scene.updateCompanionAttack(), false);
  assert.equal(mole.getData('hp'), 2);
  scene.time.now = 900;
  scene.updateCompanionAttack();
  assert.equal(mole.getData('hp'), 1);
});

test('helper can attack and stun a nearby rolling stone', () => {
  const { scene, monster } = setup({ hp: 5 });
  withCompanion(scene);
  monster.x = 450;
  monster.y = 135;
  assert.equal(scene.updateCompanionAttack(), true);
  assert.equal(monster.getData('hp'), 4);
  assert.equal(monster.getData('stoneState'), 'stunned');
});

test('helper attack protection is brief and preserves longer respawn protection', () => {
  const { scene, monster } = setup(); monster.active = false;
  withMole(scene); withCompanion(scene);
  scene.updateCompanionAttack();
  scene.time.now = 299;
  scene.damageCompanion();
  assert.equal(scene.companionHealth, 1);
  scene.hideCompanionTemporarily = () => { scene.helperHidden = true; };
  scene.time.now = 300;
  scene.damageCompanion();
  assert.equal(scene.companionHealth, 0);
  assert.equal(scene.helperHidden, true);
  withCompanion(scene);
  scene.companion.setData('invulnerableUntil', 1500);
  scene.updateCompanionAttack();
  assert.equal(scene.companion.getData('invulnerableUntil'), 1500);
});

test('helper approaches visible enemies instead of trying to strike out of reach', () => {
  const { scene, monster } = setup();
  monster.active = false;
  const { mole } = withMole(scene);
  withCompanion(scene);
  mole.x = 520;
  assert.equal(scene.updateCompanionAttack(), true);
  assert.equal(mole.getData('hp'), 3);
  assert.equal(scene.companion.body.velocity.x, 160);
  assert.equal(scene.companion.texture.key, 'companion-detected');
});

test('helper cannot attack through walls or from too far away', () => {
  const { scene, monster } = setup();
  monster.active = false;
  const { mole } = withMole(scene);
  withCompanion(scene);
  scene.hasLineOfSight = () => false;
  assert.equal(scene.updateCompanionAttack(), false);
  scene.hasLineOfSight = () => true;
  mole.x = 1500;
  assert.equal(scene.updateCompanionAttack(), false);
  assert.equal(mole.getData('hp'), 3);
});

test('dead, hidden, unequipped, flying, or paused helpers cannot inflict damage', () => {
  for (const state of ['dead', 'hidden', 'unequipped', 'flying', 'paused', 'respawning']) {
    const { scene, monster } = setup(); monster.active = false;
    const { mole } = withMole(scene);
    withCompanion(scene);
    if (state === 'dead') scene.companionHealth = 0;
    if (state === 'hidden') scene.companion.visible = false;
    if (state === 'unequipped') scene.companionEnabled = false;
    if (state === 'flying') scene.companion.body.enable = false;
    if (state === 'paused') scene.isPaused = true;
    if (state === 'respawning') scene.companionRespawnAt = 1000;
    assert.equal(scene.updateCompanionAttack(), false, state);
    assert.equal(mole.getData('hp'), 3, state);
  }
});

for (const key of ['ENTER', 'ESC']) {
  test(`after death, ${key} restores both characters and saves full health before leaving`, () => {
    const { scene } = setup();
    withCompanion(scene);
    scene.health = 0; scene.companionHealth = 0; scene.companionRespawnAt = 10000;
    const timer = { removed: false, remove() { this.removed = true; } };
    scene.companionRespawnTimer = timer;
    let saved = { health: 0, coins: 123 };
    scene.registry = { get: () => saved, set: (_, value) => { saved = value; } };
    scene.player.body.setVelocity = () => {};
    scene.input = { keyboard: new EventEmitter() };
    scene.physics = { world: { pause() {} } };
    scene.promptBox = { setVisible() {} };
    scene.promptText = scene.promptHint = { setText() {} };
    scene.scene = { restart() { this.restarted = true; }, start(name) { this.started = name; } };
    context.Scene.prototype.triggerGameOver.call(scene);
    scene.input.keyboard.emit(`keydown-${key}`);
    assert.equal(scene.health, 5);
    assert.equal(scene.companionHealth, 1);
    assert.equal(scene.companionRespawnAt, 0);
    assert.equal(timer.removed, true);
    assert.equal(saved.health, 5);
    assert.equal(saved.coins, 123);
    assert.equal(scene.hud.health, 5);
    assert.equal(scene.hud.companion.health, 1);
    assert.equal(key === 'ENTER' ? scene.scene.restarted : scene.scene.started, key === 'ENTER' ? true : 'UndergroundMapScene');
  });
}

function withHammer(scene) {
  withSword(scene);
  scene.equipped.weapon = 'powerHammer';
  scene.player.body.blocked = { down: false };
  scene.player.body.velocity = { x: 0, y: -100 };
  scene.player.body.bottom = 160;
  scene.player.body.setVelocityX = function(x) { this.velocity.x = x; };
  scene.player.body.setVelocityY = function(y) { this.velocity.y = y; };
  const textures = context.getWeaponTextures('powerHammer');
  Object.entries(textures).forEach(([key, value]) => scene.player.setData(key, value));
  scene.add = { ellipse() { return { setDepth() { return this; }, setScale() { return this; }, destroy() {} }; } };
  scene.cameras = { main: { shake() {} } };
  scene.hasLineOfSight = () => true;
  scene.updateSwordHitbox();
}

test('hammer winds up before hitting, deals double stone damage, and recovers more slowly', () => {
  const { scene, monster } = setup({ hp: 5 });
  withHammer(scene); monster.x = 455; monster.y = 105;
  scene.digBlock();
  assert.equal(monster.getData('hp'), 5);
  assert.equal(scene.player.texture.key, 'knight-hammer-hitting');
  advance(scene, 109); scene.hitSwordEnemies();
  assert.equal(monster.getData('hp'), 5);
  advance(scene, 110); scene.hitSwordEnemies();
  assert.equal(monster.getData('hp'), 3);
  assert.equal(monster.getData('stoneState'), 'stunned');
  advance(scene, 140);
  assert.equal(scene.startSwing(), false);
  advance(scene, 320);
  assert.equal(scene.startSwing(), true);
});

test('normal hammer hit still deals one damage to moles and only one hit per swing', () => {
  const { scene, monster } = setup(); monster.active = false;
  withHammer(scene); const { mole } = withMole(scene);
  scene.digBlock(); advance(scene, 110); scene.hitSwordEnemies();
  scene.hitSwordEnemies();
  assert.equal(mole.getData('hp'), 2);
});
test('charged underground hammer keeps its windup, applies the larger stone hit once, and leaves normal attacks available',()=>{
  const {scene,monster}=setup({hp:10});withHammer(scene);monster.x=455;monster.y=105;
  scene.digBlock({id:'super',charged:true,superCharge:true,multiplier:3,progress:1});
  advance(scene,79);scene.hitSwordEnemies();assert.equal(monster.getData('hp'),10);
  advance(scene,80);scene.hitSwordEnemies();assert.equal(monster.getData('hp'),4);
  scene.hitSwordEnemies();assert.equal(monster.getData('hp'),4);
  advance(scene,360);assert.equal(scene.startSwing(),true);assert.equal(scene.hammerAttack,null);
});

test('pausing a hammer windup cannot make its damage precede the visible swing', () => {
  const { scene, monster } = setup({ hp: 5 });
  withHammer(scene); monster.x = 455; monster.y = 105;
  scene.digBlock(); scene.time.now = 5000; scene.swingTimer.elapsed = 109;
  scene.hitSwordEnemies(); assert.equal(monster.getData('hp'), 5);
  scene.swingTimer.elapsed = 110; scene.hitSwordEnemies(); assert.equal(monster.getData('hp'), 3);
});

test('a landing recovery never becomes a second melee hit when its real timer advances', () => {
  const { scene, monster } = setup({ hp: 5 });
  withHammer(scene); monster.x = 455; monster.y = 105;
  scene.digBlock(); scene.swingReadyAt = Infinity; scene.swingTimer.elapsed = 250;
  scene.hitSwordEnemies(); assert.equal(monster.getData('hp'), 5);
});

test('successive slower hammer swings can keep a stone stunned', () => {
  const { scene, monster } = setup({ hp: 5 });
  withHammer(scene); monster.x = 455; monster.y = 105;
  for (let hit = 0; hit < 3; hit += 1) {
    advance(scene, hit * 320); scene.digBlock();
    advance(scene, hit * 320 + 110); scene.hitSwordEnemies();
    if (monster.active) {
      scene.updateStoneMonsters();
      assert.equal(monster.getData('stoneState'), 'stunned');
    }
  }
  assert.equal(monster.active, false);
  assert.equal(scene.health, 5);
});

test('hammer slam starts only in midair with hammer equipped and does not hit until landing', () => {
  const { scene, monster } = setup({ hp: 5 });
  withHammer(scene); monster.x = 455; monster.y = 105;
  scene.equipped.weapon = 'sword'; assert.equal(scene.beginHammerSlam(), false);
  scene.equipped.weapon = 'powerHammer';
  scene.player.body.blocked.down = true; assert.equal(scene.beginHammerSlam(), false);
  scene.player.body.blocked.down = false;
  assert.equal(scene.beginHammerSlam(), true);
  assert.equal(scene.player.body.velocity.y, 500);
  assert.equal(scene.beginHammerSlam(), false);
  scene.hitSwordEnemies();
  assert.equal(monster.getData('hp'), 5);
});

test('landing slam hits all nearby enemies on both sides, adds 50%, and cannot hit twice', () => {
  const { scene, monster } = setup({ hp: 5 });
  withHammer(scene); monster.x = 460; monster.y = 140;
  const left = actor(350, 160, { hp: 3 });
  const right = actor(480, 160, { hp: 3 });
  const far = actor(700, 160, { hp: 3 });
  scene.molesGroup = { getChildren: () => [left, right, far] };
  scene.beginHammerSlam(); scene.landHammerSlam();
  assert.equal(left.getData('hp'), 1.5);
  assert.equal(right.getData('hp'), 1.5);
  assert.equal(far.getData('hp'), 3);
  assert.equal(monster.getData('hp'), 2);
  scene.landHammerSlam(); scene.hitSwordEnemies();
  assert.equal(monster.getData('hp'), 2);
  assert.equal(left.getData('hp'), 1.5);
  assert.equal(scene.startSwing(), false);
  advance(scene, 320);
  assert.equal(scene.startSwing(), true);
});

test('slam does not hit through solid walls', () => {
  const { scene, monster } = setup({ hp: 5 });
  withHammer(scene); monster.x = 460; monster.y = 140;
  scene.hasLineOfSight = () => false;
  scene.beginHammerSlam(); scene.landHammerSlam();
  assert.equal(monster.getData('hp'), 5);
});

test('sword damage is unchanged and does not get the hammer stone bonus', () => {
  assert.equal(context.getWeaponDamage('sword', false), 1);
  assert.equal(context.getWeaponDamage('sword', true), 1);
  assert.equal(context.getWeaponDamage('powerHammer', true), 2);
  assert.equal(context.getWeaponDamage('powerHammer', true, 1.5), 3);
});

function withDigBlock(scene, type, col = 10, row = 2) {
  const block = actor(435, 120, { type, col, row });
  scene.blocks = {
    children: { size: 1 }, getChildren: () => [block],
    remove(value) { value.destroy(); },
  };
  scene.blockMap.set(`${col},${row}`, block);
  return block;
}

for (const weapon of ['sword', 'powerHammer']) {
  for (const type of ['earth', 'stone', 'black']) {
    test(`${weapon} forward strike ${type === 'earth' || (type === 'stone' && weapon === 'powerHammer') ? 'breaks' : 'cannot break'} ${type} tiles`, () => {
      const { scene, monster } = setup(); monster.active = false;
      withSword(scene); scene.equipped.weapon = weapon;
      const block = withDigBlock(scene, type);
      scene.digBlock();
      const shouldBreak = type === 'earth' || (type === 'stone' && weapon === 'powerHammer');
      assert.equal(block.active, !shouldBreak);
      assert.equal(scene.blockMap.has('10,2'), !shouldBreak);
    });
  }
  test(`${weapon} downward strike handles the stone tile directly beneath the feet`, () => {
    const { scene, monster } = setup(); monster.active = false;
    withSword(scene); scene.equipped.weapon = weapon;
    scene.player.body.bottom = 160;
    const block = withDigBlock(scene, 'stone', 10, 4);
    scene.performDownStrike();
    assert.equal(block.active, weapon === 'sword');
    assert.equal(scene.blockMap.has('10,4'), weapon === 'sword');
  });
}

for (const weapon of ['sword', 'powerHammer']) {
  for (const facing of [-1, 1]) {
    test(`crouched ${weapon} facing ${facing} digs only the foot-level row even with raised auto-aim`, () => {
      const { scene, monster } = setup(); monster.active = false;
      withSword(scene); scene.equipped.weapon = weapon;
      scene.isDucking = true; scene.facingX = facing;
      scene.player.body.bottom = 160;
      scene.autoAimEnabled = true;
      const target = actor(400 + facing * 42, 110);
      scene.autoAimTarget = { enemy: target, kind: 'mole' };
      // Keep the fixture's target fixed so the tile check also covers upward aim.
      scene.applyAutoAim = () => {};
      const col = facing > 0 ? 11 : 9;
      const tiles = [2, 3, 4].map(row => {
        const block = actor(0, 0, { type: 'earth', col, row });
        block.getBounds = () => new Rectangle(col * 40, row * 40, 40, 40);
        scene.blockMap.set(`${col},${row}`, block);
        return block;
      });
      scene.blocks = { children: { size: tiles.length }, getChildren: () => tiles,
        remove(block) { block.destroy(); } };
      scene.digBlock();
      assert.equal(tiles[0].active, true, 'upper tile stays intact');
      assert.equal(tiles[1].active, false, 'lower tile in front is broken');
      assert.equal(tiles[2].active, true, 'floor stays intact during a forward strike');
      assert.equal(scene.blockMap.has(`${col},3`), false);
    });
  }
}

for (const type of ['earth', 'stone', 'black']) {
test(`hammer landing handles ${type} beneath the impact and keeps surrounding tiles intact`, () => {
  const { scene, monster } = setup(); monster.active = false;
  withHammer(scene);
  const block = withDigBlock(scene, type, 10, 4);
  const neighbor = actor(475, 160, { type: 'stone', col: 11, row: 4 });
  scene.blockMap.set('11,4', neighbor);
  scene.beginHammerSlam(); scene.landHammerSlam();
  assert.equal(block.active, type === 'black');
  assert.equal(scene.blockMap.has('10,4'), type === 'black');
  assert.equal(neighbor.active, true);
  assert.equal(scene.blockMap.has('11,4'), true);
});
}

function withBoss(levelId = 'Schluesselweg') {
  const config = vm.runInContext('UNDERGROUND_BOSSES.' + levelId, context);
  const { scene, monster } = setup({
    isStoneBoss: true, bossConfig: config, bossStage: 1, hp: config.maxHp,
    maxHp: config.maxHp, bossHomeX: 700, bossHomeY: 100,
  });
  Object.assign(scene, {
    levelId, bossEncounter: config, bossUpperTiles: [], keyPathArenaTriggered: true,
    keyPathMiniBoss: monster, coinsCollected: 30,
    inventory: { weapons: { sword: true }, passives: {}, consumables: { honey: 2 }, companions: { default: true } },
    equipped: { weapon: 'sword', companion: 'default' },
    physics: { world: { pause() {} } }, showDanger() {},
    scene: { start(key) { this.destination = key; } },
  });
  scene.player.body.setVelocity = () => {};
  scene.hud.setCoins = value => { scene.hud.coins = value; };
  let saved = { coins: 30, health: 5, completedLevels: [], unlockedLevels: [levelId] };
  scene.registry = { get: () => saved, set: (_, next) => { saved = next; } };
  return { scene, monster, config, getSaved: () => saved };
}

test('boss armor blocks damage while rolling, dropping, waiting, or outside the arena', () => {
  const { scene, monster, config } = withBoss();
  for (const state of ['rolling', 'dropping', 'returning', 'ready', 'perched']) {
    monster.setData('stoneState', state);
    assert.equal(scene.damageStoneMonster(monster, 3), false);
    assert.equal(monster.getData('hp'), config.maxHp);
    assert.equal(monster.getData('stoneState'), state);
  }
  monster.setData('stoneState', 'rolling');
  scene.stunStoneMonster(monster);
  scene.keyPathArenaTriggered = false;
  assert.equal(scene.damageStoneMonster(monster, 3), false);
  assert.equal(monster.getData('hp'), config.maxHp);
});

for (const level of ['Schluesselweg', 'Kristalltiefen']) {
test(level + ': boss permits two hits per impact and repeated attacks cannot extend its stun', () => {
  const { scene, monster, config } = withBoss(level);
  scene.stunStoneMonster(monster);
  const until = monster.getData('stateUntil');
  for (let i = 0; i < 8; i += 1) {
    scene.time.now = i * 100;
    scene.damageStoneMonster(monster, 1);
    scene.stunStoneMonster(monster);
  }
  assert.equal(monster.getData('hp'), config.maxHp - 2);
  assert.equal(monster.getData('stateUntil'), until);
  assert.equal(monster.getData('bossHitsLeft'), 0);
  scene.time.now = until; scene.updateStoneMonsters();
  assert.equal(monster.getData('stoneState'), 'rolling');
});
}

test('helper gets one separate boss hit without consuming either player opening', () => {
  const { scene, monster, config } = withBoss();
  scene.stunStoneMonster(monster);
  scene.damageStoneMonster(monster, 1, 'companion');
  scene.damageStoneMonster(monster, 1, 'companion');
  assert.equal(monster.getData('hp'), config.maxHp - 1);
  assert.equal(monster.getData('bossHitsLeft'), 2);
  scene.damageStoneMonster(monster, 1); scene.damageStoneMonster(monster, 1);
  assert.equal(monster.getData('hp'), config.maxHp - 3);
  assert.equal(monster.getData('bossHitsLeft'), 0);
});

test('phase boundaries prevent burst kills, restore the upper tier, and give a safe return telegraph', () => {
  const { scene, monster, config } = withBoss();
  const restored = [];
  scene.bossUpperTiles = [{ col: 20, row: 3, type: 'earth' }];
  scene.placeBlock = (...args) => restored.push(args);
  scene.stunStoneMonster(monster);
  scene.damageStoneMonster(monster, 999);
  assert.equal(monster.active, true);
  assert.equal(monster.getData('hp'), context.getBossStageFloor(config.maxHp, 1));
  assert.equal(monster.getData('bossStage'), 2);
  assert.equal(monster.getData('stoneState'), 'returning');
  assert.equal(scene.tweens.pending.y, 100);
  assert.equal(scene.damageStoneMonster(monster, 999), false);
  scene.tweens.pending.onComplete();
  assert.equal(restored.length, 1);
  assert.equal(restored[0][0], 20);
  assert.equal(restored[0][2], 'earth');
  assert.equal(monster.x, 700);
  assert.equal(monster.getData('stoneState'), 'ready');
  scene.time.now = monster.getData('bossReadyUntil') - 1;
  scene.updateStoneMonsters();
  assert.equal(monster.getData('stoneState'), 'ready');
  scene.time.now += 1; scene.updateStoneMonsters();
  assert.equal(monster.getData('stoneState'), 'rolling');
});

test('rebuilding the upper tier never traps the player in a new tile', () => {
  const { scene, monster } = withBoss();
  scene.player.body = { x: 800, y: 120, width: 20, height: 40 };
  scene.bossUpperTiles = [{ col: 20, row: 3, type: 'earth' }, { col: 22, row: 3, type: 'earth' }];
  const restored = [];
  scene.placeBlock = (...args) => restored.push(args);
  scene.returnBossToUpperTier(monster);
  scene.tweens.pending.onComplete();
  assert.equal(restored.length, 1);
  assert.equal(restored[0][0], 22);
});

test('boss becomes faster in each phase and the super boss is stronger', () => {
  for (const level of ['Schluesselweg', 'Kristalltiefen']) {
    const { scene, monster, config } = withBoss(level);
    for (let stage = 1; stage <= 3; stage += 1) {
      monster.x = 400; monster.setData('bossStage', stage);
      monster.setData('stoneState', 'rolling'); monster.setData('bossPhase', 'groundSweep');
      scene.updateStoneMonsterRoll(monster, .05);
      assert.equal(monster.x, 400 + (config.rollSpeed + (stage - 1) * config.speedPerStage) * .05);
    }
  }
  const normal = withBoss(), superBoss = withBoss('Kristalltiefen');
  assert.ok(superBoss.config.maxHp > normal.config.maxHp);
  assert.ok(superBoss.config.rollSpeed > normal.config.rollSpeed);
});

test('first guardian stays vulnerable long enough for a late reaction even in phase three', () => {
  const { scene, monster } = withBoss();
  monster.setData('bossStage', 3);
  scene.stunStoneMonster(monster);
  const until = monster.getData('bossVulnerableUntil');
  assert.equal(until, 1600);
  scene.time.now = 1500;
  assert.equal(scene.damageStoneMonster(monster, 1), true);
  assert.equal(monster.getData('bossVulnerableUntil'), until);
  scene.time.now = until;
  assert.equal(scene.damageStoneMonster(monster, 1), false);
});

test('first guardian can be beaten with six normal hammer hits while retaining all three phases', () => {
  const { scene, monster, getSaved } = withBoss();
  for (let stage = 1; stage <= 3; stage++) {
    monster.setData('stoneState', 'rolling');
    scene.stunStoneMonster(monster);
    assert.equal(scene.damageStoneMonster(monster, context.getWeaponDamage('powerHammer', true)), true);
    assert.equal(scene.damageStoneMonster(monster, context.getWeaponDamage('powerHammer', true)), true);
    assert.equal(monster.getData('hp'), 12 - stage * 4);
    if (stage < 3) {
      assert.equal(monster.getData('stoneState'), 'returning');
      assert.equal(monster.getData('bossStage'), stage + 1);
      scene.tweens.pending.onComplete();
      scene.time.now = monster.getData('bossReadyUntil');
    }
  }
  assert.equal(scene.levelCompleted, true);
  assert.equal(getSaved().unlockedLevels.includes('Kristalltiefen'), true);
});

for (const level of ['Schluesselweg', 'Kristalltiefen']) {
  test(level + ': victory requires three phases and immediately saves completion, reward, and unlock', () => {
    const { scene, monster, config, getSaved } = withBoss(level);
    for (let stage = 1; stage <= 3; stage += 1) {
      monster.setData('stoneState', 'rolling');
      scene.stunStoneMonster(monster);
      scene.damageStoneMonster(monster, 999);
      if (stage < 3) {
        assert.equal(scene.levelCompleted, undefined);
        scene.tweens.pending.onComplete();
        scene.time.now = monster.getData('bossReadyUntil');
      }
    }
    assert.equal(monster.active, false);
    assert.equal(scene.levelCompleted, true);
    assert.equal(scene.time.paused, true);
    assert.equal(getSaved().completedLevels.includes(level), true);
    assert.equal(getSaved().coins, 30 + config.reward);
    assert.equal(getSaved().inventory.consumables.honey, 2);
    if (config.unlock) assert.equal(getSaved().unlockedLevels.includes(config.unlock), true);
    assert.equal(getSaved().currentLevel, config.unlockWorld ? level : config.unlock || level);
    assert.equal(getSaved().mapState.undergroundNode, config.unlockWorld ? level : config.unlock || level);
    if (config.unlockWorld) {
      assert.equal(getSaved().unlockedWorlds.includes('jungle'), true);
      assert.equal(getSaved().unlockedLevels.includes('Urwaldkronen'), true);
      assert.equal(getSaved().unlockedLevels.includes('UrwaldShop'), false);
      assert.equal(getSaved().currentWorld, 'underground');
    }
    assert.equal(context.victory.name, config.name);
    scene.winBossLevel(config);
    assert.equal(getSaved().coins, 30 + config.reward);
    context.victory.onContinue();
    assert.equal(scene.scene.destination, 'UndergroundMapScene');
    assert.equal(scene.time.paused, false);
  });
  test(level + ': replaying a completed boss keeps loot but cannot pay its completion bonus again',()=>{
    const {scene,config,getSaved}=withBoss(level);getSaved().completedLevels.push(level);
    scene.winBossLevel(config);assert.equal(getSaved().coins,30);assert.equal(context.victory.reward,0);
    assert.equal(getSaved().inventory.consumables.honey,2);assert.ok(getSaved().unlockedLevels.includes(config.unlock));
  });
}

test('Kristalltiefen contains five supported chests, healing, enemies, a sealed arena and no invalid tiles', () => {
  const map = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/levels/underground_crystal.json')));
  const keys = new Set(map.blocks.map(b => b.col + ',' + b.row));
  assert.equal(keys.size, map.blocks.length);
  assert.equal(map.chests.length, 5);
  for (const block of map.blocks) {
    assert.ok(block.col >= 0 && block.col < map.cols && block.row >= 0 && block.row < map.rows);
  }
  for (const chest of map.chests) {
    assert.equal(keys.has(chest.col + ',' + chest.row), false);
    assert.equal(keys.has(chest.col + ',' + (chest.row + 1)), true);
    assert.ok(chest.col < map.bossArena.wallCol);
  }
  assert.equal(keys.has(map.start.col + ',' + map.start.row), false);
  assert.ok(map.hearts.length >= 2);
  assert.ok(map.moles.length > 0 && map.stoneMonsters.length > 0);
  assert.ok(map.bossArena.triggerCol > map.bossArena.wallCol);
  assert.ok(map.bossArena.bossCol > map.bossArena.triggerCol);
});

function withAutoAim(scene) {
  withSword(scene);
  scene.autoAimEnabled = true;
  scene.hasLineOfSight = () => true;
}

test('underground auto-aim turns toward a nearby enemy behind the player before attacking', () => {
  const { scene, monster } = setup(); monster.active = false;
  withAutoAim(scene);
  const { mole } = withMole(scene); mole.x = 360;
  scene.digBlock();
  assert.equal(scene.facingX, -1);
  assert.equal(mole.getData('hp'), 2);
});

test('disabled auto-aim leaves manual direction and attack reach unchanged', () => {
  const { scene, monster } = setup(); monster.active = false;
  withAutoAim(scene); scene.autoAimEnabled = false;
  const { mole } = withMole(scene); mole.x = 360;
  scene.digBlock();
  assert.equal(scene.facingX, 1);
  assert.equal(mole.getData('hp'), 3);
});

test('auto-aim ignores targets behind walls and selects a visible nearby target', () => {
  const { scene, monster } = setup(); monster.active = false;
  withAutoAim(scene);
  const left = actor(365, 140), right = actor(445, 140);
  scene.molesGroup = { getChildren: () => [left, right] };
  scene.hasLineOfSight = (_x, _y, targetX) => targetX > scene.player.x;
  scene.applyAutoAim();
  assert.equal(scene.autoAimTarget.enemy, right);
  assert.equal(scene.facingX, 1);
  scene.hasLineOfSight = () => false;
  scene.applyAutoAim();
  assert.equal(scene.autoAimTarget, null);
});

test('auto-aim does not pull aim toward distant or vertically unreachable enemies', () => {
  const { scene, monster } = setup(); monster.active = false;
  withAutoAim(scene);
  const { mole } = withMole(scene); mole.x = 1000;
  scene.applyAutoAim(); assert.equal(scene.autoAimTarget, null);
  mole.x = 360; mole.y = -300;
  scene.applyAutoAim(); assert.equal(scene.autoAimTarget, null);
});

test('auto-aim keeps its chosen direction for an entire swing including hammer windup', () => {
  const { scene, monster } = setup();
  withHammer(scene); scene.autoAimEnabled = true;
  monster.x = 350; monster.y = 105;
  scene.startSwing();
  assert.equal(scene.facingX, -1);
  monster.x = 450;
  scene.applyAutoAim();
  assert.equal(scene.facingX, -1);
  assert.equal(scene.isSwinging, true);
});

test('auto-aim also reaches bats in melee range and a swing damages each bat only once', () => {
  const { scene, monster } = setup(); monster.active = false;
  withAutoAim(scene);
  const bat = actor(365, 92, { hp: 2 });
  scene.batsGroup = { getChildren: () => [bat] };
  scene.batSystem = {
    getBounds: enemy => new Rectangle(enemy.x - 17, enemy.y - 12, 34, 24),
    damage(enemy, amount) { enemy.setData('hp', enemy.getData('hp') - amount); },
  };
  scene.digBlock();
  assert.equal(scene.autoAimTarget.enemy, bat);
  assert.equal(scene.facingX, -1);
  assert.equal(bat.getData('hp'), 1);
  scene.hitSwordEnemies();
  assert.equal(bat.getData('hp'), 1);
});

for (const damage of [1, 2]) {
  test('flying enemy hit applies ' + damage + ' damage and protects against repeated overlap', () => {
    const { scene } = setup();
    assert.equal(scene.applyFlyingEnemyHit(damage), true);
    assert.equal(scene.health, 5 - damage);
    assert.equal(scene.hud.health, 5 - damage);
    assert.equal(scene.saves, 1);
    scene.time.now = 999;
    assert.equal(scene.applyFlyingEnemyHit(damage), false);
    assert.equal(scene.health, 5 - damage);
  });
}

test('shield absorbs bat and poisonous berry damage without losing hearts', () => {
  const { scene } = setup();
  const shield = withShield(scene);
  scene.applyFlyingEnemyHit(2);
  assert.equal(scene.health, 5);
  assert.equal(shield.active, false);
  assert.equal(shield.bubble.visible, false);
  scene.time.now = 1; scene.applyFlyingEnemyHit(1);
  assert.equal(scene.health, 5);
});

for (const flag of ['isPaused', 'isGameOver', 'levelCompleted']) {
  test(flag + ' prevents bat and berry damage', () => {
    const { scene } = setup(); scene[flag] = true;
    assert.equal(scene.applyFlyingEnemyHit(2), false);
    assert.equal(scene.health, 5);
    assert.equal(scene.saves, 0);
  });
}

test('respawn protection does not consume a shield when a bat or berry touches the player', () => {
  const { scene } = setup();
  const shield = withShield(scene);
  scene.player.setData('invulnerableUntil', 1000);
  scene.applyFlyingEnemyHit(2);
  assert.equal(scene.health, 5);
  assert.equal(shield.active, true);
});

test('a fatal berry hit triggers defeat once', () => {
  const { scene } = setup();
  scene.health = 2;
  scene.applyFlyingEnemyHit(2);
  assert.equal(scene.health, 0);
  assert.equal(scene.isGameOver, true);
  scene.time.now = 2000; scene.applyFlyingEnemyHit(2);
  assert.equal(scene.saves, 1);
});
