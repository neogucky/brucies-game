const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { EventEmitter } = require('node:events');
const ctx = vm.createContext({ Phaser: { Scene: class {} }, performance: { now: () => 100 }, saveProgress: value => { ctx.saved = value; } });
function load(file, name) {
  let code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/^import[\s\S]*?;\n/gm, '');
  if (name) code = code.replace(/export default class \w+/, 'globalThis.' + name + ' = class ' + name);
  vm.runInContext(code.replace(/export /g, ''), ctx);
}
load('src/utils/hammerRules.js'); load('src/utils/weapons.js');
load('src/utils/HammerCharge.js', 'HammerCharge'); load('src/utils/WeaponSwitch.js', 'WeaponSwitch');
load('src/utils/controlProfiles.js'); load('src/utils/PortableControls.js', 'PortableControls');
load('src/utils/hammerTraining.js'); load('src/scenes/HammerTrainingScene.js', 'HammerTrainingScene');

function graphic() {
  const g = { scene: {}, active: true };
  for (const method of ['setVisible','setDepth','setOrigin','setText','setColor','setPosition','clear','lineStyle','strokePoints','setScale'])
    g[method] = function(...args) { this[method + 'Args'] = args; return this; };
  g.destroy = () => { g.active = false; g.scene = null; };
  return g;
}
function fixture(weapon = 'powerHammer') {
  const sounds = [], attacks = [], keyboard = new EventEmitter();
  const scene = { sys: { settings: { key: 'JungleScene' } }, equipped: { weapon }, time: { now: 0 },
    input: { keyboard }, add: { graphics: graphic, text: graphic, ellipse: graphic },
    player: { active: true, x: 100, y: 200, depth: 10, displayHeight: 90, body: { bottom: 200 } },
    tweens: { add() {} },
    sound: { play: (...args) => sounds.push(args), add: () => ({
      play() { this.playing = true; }, setRate(n) { this.rate = n; },
      stop() { this.stopped = true; }, destroy() { this.destroyed = true; },
    }) },
    startSwing(attack) { this.isSwinging = true; this.hammerAttack = attack; this.swingHits = new Set(); attacks.push(attack); return true; },
  };
  const charge = scene.hammerCharge = new ctx.HammerCharge(scene);
  const advance = ms => { for (let left = ms; left > 0; left -= 10) charge.update(Math.min(10, left) / 1000); };
  return { scene, charge, advance, attacks, sounds, keyboard };
}
test('tap, yellow, red and blue have distinct thresholds and damage increases up to its cap', () => {
  for (const [ms, id] of [[0,'normal'],[179,'normal'],[180,'quick'],[749,'quick'],[750,'power'],[1499,'power'],[1500,'super'],[9000,'super']])
    assert.equal(ctx.hammerAttackForHold(ms).id, id);
  let damage = 0;
  for (let ms = 0; ms <= 5000; ms++) { const a = ctx.hammerAttackForHold(ms); assert.ok(a.multiplier >= damage); damage = a.multiplier; }
  assert.equal(damage, 3); assert.equal(ctx.hammerAttackForHold(NaN).id, 'normal');
  assert.equal(ctx.hammerAttackForHold(-50).id, 'normal');
});
test('sword starts on key down; a quick hammer tap releases one ordinary attack', () => {
  const sword = fixture('sword'); sword.charge.press(); assert.equal(sword.attacks.length, 1);
  assert.equal(sword.charge.holding, false); sword.charge.release(); assert.equal(sword.attacks.length, 1);
  const hammer = fixture(); hammer.charge.press(); hammer.advance(60); assert.equal(hammer.attacks.length, 0);
  hammer.charge.release(); hammer.charge.release(); assert.equal(hammer.attacks.length, 1);
  assert.equal(hammer.attacks[0].id, 'normal'); assert.equal(hammer.attacks[0].multiplier, 1);
});
test('holding does not attack, auto-repeat cannot reset charge, and movement stays at 80% after full charge', () => {
  const f = fixture(); f.charge.press(); f.advance(400); assert.equal(f.charge.moveFactor, .8);
  f.charge.press(); assert.equal(f.charge.elapsed, 400); f.advance(8000);
  assert.equal(f.attacks.length, 0); assert.equal(f.charge.moveFactor, .8);
  f.charge.release(); assert.equal(f.attacks[0].id, 'super'); assert.equal(f.charge.moveFactor, 1);
});
test('charge hum rises, stage sounds play once per transition, release disposes the loop', () => {
  const f = fixture(); f.charge.press(); f.advance(400); const hum = f.charge.hum, rate = hum.rate;
  f.advance(1300); assert.ok(hum.rate > rate); assert.equal(f.sounds.length, 3);
  f.charge.release(); assert.ok(hum.stopped && hum.destroyed); assert.equal(f.charge.hum, null);
});
for (const blocked of ['isPaused','inventoryOpen','climbingVine','isGameOver','levelCompleted','isComplete','attackInputLocked'])
  test(blocked + ' cancels holding without releasing an attack', () => {
    const f = fixture(); f.charge.press(); f.advance(400); f.scene[blocked] = true;
    assert.equal(f.charge.release(), false); assert.equal(f.attacks.length, 0); assert.equal(f.charge.moveFactor, 1);
  });
test('switching weapon while holding safely cancels the queued hammer swing', () => {
  const f = fixture(); f.charge.press(); f.advance(500); f.scene.equipped.weapon = 'sword'; f.charge.update(.016);
  f.charge.release(); assert.equal(f.attacks.length, 0); assert.equal(f.charge.holding, false);
});
test('bow to hammer keeps the existing switch delay and an early release becomes a normal tap', () => {
  const f = fixture(); const swap = f.scene.weaponSwitch = new ctx.WeaponSwitch(f.scene); swap.hand = 'bow'; swap.syncAppearance = () => {};
  f.scene.equipped.secondary = 'bow'; f.charge.press(); f.advance(500);
  assert.equal(f.charge.elapsed, 0); f.charge.release(); assert.equal(f.attacks.length, 0);
  for (let i = 0; i < 4; i++) swap.update(.05);
  assert.equal(f.attacks.length, 1); assert.equal(f.attacks[0].id, 'normal'); assert.equal(swap.hand, 'melee');
});
test('canceling a delayed switch prevents a ghost attack, and charging blocks the bow', () => {
  const f = fixture(); const swap = f.scene.weaponSwitch = new ctx.WeaponSwitch(f.scene); swap.hand = 'bow'; swap.syncAppearance = () => {};
  f.scene.equipped.secondary = 'bow'; f.charge.press(); f.charge.release(); f.charge.cancel();
  for (let i = 0; i < 4; i++) swap.update(.05);
  assert.equal(f.attacks.length, 0); f.charge.press();
  let fired = false; swap.request('bow', () => { fired = true; }); assert.equal(fired, false);
});
test('charged stone damage keeps the stone multiplier while sword damage ignores stale hammer charge', () => {
  const s = { equipped: { weapon: 'powerHammer' }, hammerAttack: ctx.hammerAttackForHold(1500) };
  assert.equal(ctx.getMeleeDamage(s), 3); assert.equal(ctx.getMeleeDamage(s, true), 6);
  s.equipped.weapon = 'sword'; assert.equal(ctx.getMeleeDamage(s, true), 1);
  const normal = ctx.getAttackStats('powerHammer', ctx.hammerAttackForHold(50)); assert.equal(normal.windupMs, 110);
});
function target(x, y) { return { active: true, hp: 20, getData() {}, getBounds: () => ({ x, y, width: 20, height: 30 }) }; }
test('blue wave waits for the ground impact, deduplicates the direct hit and cannot hit through walls', () => {
  const f = fixture(), direct = target(125,165), behind = target(50,170), blocked = target(160,165), far = target(400,170);
  f.scene.monsters = { getChildren: () => [direct, behind, blocked, far] };
  f.scene.damageMonster = (enemy, n) => { enemy.hp -= n; };
  f.scene.hasLineOfSight = (_x,_y,x) => x < 160;
  f.charge.press(); f.advance(1700); f.charge.release(); f.scene.swingHits.add(direct);
  f.advance(200); assert.equal(behind.hp, 20); f.advance(20);
  assert.equal(behind.hp, 17); assert.equal(direct.hp, 20); assert.equal(blocked.hp, 20); assert.equal(far.hp, 20);
  f.advance(1000); assert.equal(behind.hp, 17);
});
test('wave skips hidden/emerging enemies and uses stone damage for rolling stones', () => {
  const f = fixture(), emerging = target(110,170), stone = target(110,170);
  emerging.getData = () => true;
  f.scene.monsters = { getChildren: () => [emerging] }; f.scene.damageMonster = () => { throw Error('emerging target'); };
  f.scene.stoneMonstersGroup = { getChildren: () => [stone] }; f.scene.getStoneMonsterHitbox = s => s.getBounds();
  f.scene.damageStoneMonster = (s,n) => { s.hp -= n; };
  ctx.applyHammerWave(f.scene, ctx.hammerAttackForHold(1500)); assert.equal(stone.hp, 14);
});
test('touch/keyboard attack ownership releases once and scene changes cancel a held attack', () => {
  const f = fixture(), controls = Object.create(ctx.PortableControls.prototype);
  Object.assign(controls, { held: new Set(), activeScene: () => f.scene });
  controls.setHeld('attack', true); f.advance(400); controls.setHeld('attack', true);
  controls.setHeld('attack', false); controls.setHeld('attack', false); assert.equal(f.attacks.length, 1);
  f.scene.isSwinging = false; controls.setHeld('attack', true); f.advance(400);
  controls.activeScene = () => ({}); controls.setHeld('attack', false);
  assert.equal(f.charge.holding, false); assert.equal(f.attacks.length, 1);
});
test('touch pointer-up releases a charged hit; pointer cancellation and lost capture cancel it',()=>{
  const f=fixture();
  const element=()=>({dataset:{},listeners:{},append(){},appendChild(){},after(){},setAttribute(){},setPointerCapture(){},
    addEventListener(event,fn){this.listeners[event]=fn;}});
  ctx.document={createElement:element,getElementById:element};
  const controls=Object.create(ctx.PortableControls.prototype);
  Object.assign(controls,{toolbar:element(),buttons:{},touchButtons:{},held:new Set(),focus(){},activeScene:()=>f.scene});
  controls.buildToolbar();const button=controls.touchButtons.attack,event={preventDefault(){},pointerId:1};
  button.listeners.pointerdown(event);f.advance(400);button.listeners.pointercancel();assert.equal(f.attacks.length,0);
  button.listeners.pointerdown(event);f.advance(400);button.listeners.lostpointercapture();assert.equal(f.attacks.length,0);
  button.listeners.pointerdown(event);f.advance(400);button.listeners.pointerup();button.listeners.lostpointercapture();
  assert.equal(f.attacks.length,1);assert.equal(f.attacks[0].id,'quick');delete ctx.document;
});
test('blur/pause clears held charge without dealing damage and shutdown tolerates destroyed graphics', () => {
  const f = fixture(), controls = Object.create(ctx.PortableControls.prototype);
  controls.attackScene = f.scene; controls.held = new Set(['attack']); controls.heldKeys = new Map();
  f.charge.press(); f.advance(400); controls.clearHeld(); assert.equal(f.attacks.length, 0); assert.equal(f.charge.holding, false);
  f.charge.graphics.scene = undefined; f.charge.graphics.clear = () => { throw Error('already destroyed'); };
  assert.doesNotThrow(() => f.charge.destroy()); assert.equal(f.keyboard.listenerCount('keyup-SPACE'), 0);
});
test('trainer feedback distinguishes too much from too little charge in every drill', () => {
  assert.match(ctx.hammerTrainingFeedback('power','super'), /zu lange/);
  assert.match(ctx.hammerTrainingFeedback('power','quick'), /noch zu kurz/);
  assert.match(ctx.hammerTrainingFeedback('quick','super'), /gelben/);
  assert.match(ctx.hammerTrainingFeedback('super','power'), /blauen/);
  assert.match(ctx.hammerTrainingFeedback('normal','power'), /Tippe nur kurz/);
  assert.match(ctx.hammerTrainingFeedback('slam','normal'), /springst du zuerst/);
  assert.match(ctx.hammerTrainingFeedback('power','power',false), /erreichen/);
  for (const id of ['normal','quick','power','super','slam']) assert.equal(ctx.hammerTrainingFeedback(id,id), null);
});
test('hammer tutorial migrates old saves, preserves progress and is offered once with a repeat option', () => {
  let save = { coins: 50, health: 4, tutorials: { intro: true } }, starts = [];
  const s = { sys: { settings: { key: 'UndergroundShopScene' } }, inventory: { weapons: { powerHammer: true } },
    registry: { get: () => save, set: (_key,next) => { save = next; } }, scene: { start: (...args) => starts.push(args) } };
  assert.equal(ctx.offerHammerTraining(s), true); assert.equal(starts.length, 1);
  assert.equal(save.coins, 50); assert.equal(save.health, 4); assert.equal(save.tutorials.intro, true);
  assert.equal(save.tutorials.powerHammer.completed, false);
  assert.equal(ctx.offerHammerTraining(s), false); assert.equal(ctx.offerHammerTraining(s,{force:true}), true);
  s.inventory.weapons.powerHammer = false; assert.equal(ctx.offerHammerTraining(s,{force:true}), false);
});
test('existing hammer owners pause their level for practice and return without changing equipment or health', () => {
  let save = { health: 4, coins: 80, equipped: { weapon: 'powerHammer' } }, launched, paused = false, resumed;
  const parent = { sys: { settings: { key: 'JungleScene' } }, inventory: { weapons: { powerHammer: true } },
    registry: { get: () => save, set: (_key,n) => { save = n; } }, scene: { launch: (...a) => { launched = a; }, pause: () => { paused = true; } } };
  assert.equal(ctx.offerHammerTraining(parent,{resume:true}), true); assert.ok(paused && parent.attackInputLocked);
  assert.equal(launched[0], 'HammerTrainingScene'); assert.equal(launched[1].resumeScene, 'JungleScene');
  const practice = Object.create(ctx.HammerTrainingScene.prototype);
  Object.assign(practice,{resumeScene:'JungleScene',scene:{get:()=>parent,stop(){},resume:key=>{resumed=key;}}});
  practice.finish(false); assert.equal(resumed,'JungleScene'); assert.equal(parent.attackInputLocked,false);
  assert.equal(save.health,4); assert.equal(save.coins,80); assert.equal(save.equipped.weapon,'powerHammer');
  assert.equal(save.tutorials.powerHammer.completed,false);
});
test('a wrong practice swing keeps the current drill and carries its precise correction into the next demonstration', () => {
  const s = Object.create(ctx.HammerTrainingScene.prototype), text = graphic();
  Object.assign(s,{phase:'practice',drillIndex:2,worldTime:500,lessonText:text,turnText:graphic()});
  s.resolvePractice('super',true); assert.equal(s.phase,'retry'); assert.equal(s.drillIndex,2); assert.ok(s.attackInputLocked);
  assert.match(s.retryMessage,/zu lange/); assert.match(text.setTextArgs[0],/roten/);
});

function trainingFixture(drillIndex = 0) {
  ctx.Phaser.Input = { Keyboard: { JustDown(key) { const value = key.justDown; key.justDown = false; return !!value; } } };
  ctx.Phaser.Geom = { Rectangle: class { constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); } },
    Intersects: { RectangleToRectangle: (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y } };
  const s = Object.create(ctx.HammerTrainingScene.prototype), mentor = fixture().scene;
  const key = () => ({ isDown: false, resets: 0, reset() { this.isDown = false; this.resets++; } });
  const body = { bottom: 480, blocked: { down: true }, touching: {}, velocity: { x: 0, y: 0 },
    reset() {}, setVelocity(x, y) { this.velocity = { x, y }; },
    setVelocityX(x) { this.velocity.x = x; }, setVelocityY(y) { this.velocity.y = y; },
  };
  Object.assign(mentor, { player: { x: 675, y: 481.8, setPosition(x, y) { this.x = x; this.y = y; } },
    meleeAnimation: { state: { kind: 'charge' }, lastPose: {}, update() {}, restore() {} } });
  Object.assign(s, {
    sys: { settings: { key: 'HammerTrainingScene' } }, worldTime: 0, drillIndex, equipped: { weapon: 'powerHammer' },
    time: {}, input: { keyboard: new EventEmitter() }, mentor,
    player: { x: 330, y: 481.8, body, setFlipX() {} },
    cursors: { left: key(), right: key(), up: key(), down: key() },
    wasd: { A: key(), D: key(), W: key(), S: key() },
    lessonTitle: graphic(), lessonText: graphic(), turnText: graphic(), progressDots: [],
    add: { graphics: graphic, text: graphic, ellipse: graphic }, sound: mentor.sound,
    tweens: { add() {} }, dummy: { x: 405 },
    hitDummy() { this.dummyHits = (this.dummyHits || 0) + 1; },
  });
  s.hammerCharge = new ctx.HammerCharge(s);
  s.beginDrill();
  const advance = ms => { for (let left = ms; left > 0; left -= 10) { s.update(0, Math.min(left, 10)); s.hammerCharge.update(Math.min(left, 10) / 1000); } };
  return { s, mentor, body, advance };
}

test('the player can move, jump and charge while the teacher demonstrates', () => {
  const { s, body } = trainingFixture(2);
  assert.equal(s.phase, 'demo'); assert.equal(s.attackInputLocked, false);
  s.cursors.right.isDown = true; s.cursors.up.justDown = true;
  assert.equal(s.hammerCharge.press(), true);
  s.update(0, 16);
  assert.equal(body.velocity.x, 180 * .8);
  assert.equal(body.velocity.y, -390);
  assert.equal(s.hammerCharge.holding, true);
});

test('a real hammer tap hitting the dummy is accepted before the demonstration ends', () => {
  const { s, mentor, advance } = trainingFixture();
  assert.equal(s.hammerCharge.press(), true); s.hammerCharge.release(); advance(120);
  assert.equal(s.phase, 'success'); assert.equal(s.dummyHits, 1);
  assert.equal(mentor.hammerCharge.holding, false); assert.equal(mentor.isSwinging, false);
});

test('the player can land a jump attack while the teacher is still in the air', () => {
  const { s, mentor, body } = trainingFixture(4);
  body.blocked.down = false; s.activateHammerSlam();
  assert.equal(s.hammerSlamActive, true);
  body.blocked.down = true; body.velocity.y = 0; s.update(0, 16);
  assert.equal(s.phase, 'success'); assert.equal(s.dummyHits, 1);
  assert.equal(mentor.hammerSlamActive, false); assert.equal(mentor.player.y, 481.8);
});

for (const [index, id] of ['normal', 'quick', 'power', 'super', 'slam'].entries()) {
  test(id + ': a correct demonstration-time attempt stops the teacher immediately', () => {
    const { s, mentor } = trainingFixture(index);
    mentor.hammerCharge.pendingWave = { remaining: 1, attack: ctx.hammerAttackForHold(1750) };
    mentor.isSwinging = true; mentor.swingReadyAt = 0; mentor.swingUntil = 5000;
    s.resolvePractice(id, true);
    assert.equal(s.phase, 'success'); assert.equal(s.drillIndex, index);
    assert.equal(mentor.hammerCharge.holding, false); assert.equal(mentor.hammerCharge.pendingWave, null);
    assert.equal(mentor.isSwinging, false); assert.equal(mentor.hammerSlamActive, false);
    assert.equal(mentor.player.y, 481.8); assert.equal(mentor.meleeAnimation.state, null);
  });
}

test('a wrong or missed swing during a demonstration gives a tip without freezing or restarting the player', () => {
  const { s, mentor } = trainingFixture(2);
  s.cursors.right.isDown = true;
  for (const [actual, hit, message] of [['super', true, /zu lange/], ['normal', true, /noch zu kurz/], ['power', false, /erreichen/]]) {
    s.resolvePractice(actual, hit);
    assert.equal(s.phase, 'demo'); assert.equal(s.attackInputLocked, false);
    assert.equal(s.cursors.right.isDown, true); assert.equal(mentor.hammerCharge.holding, true);
    assert.equal(s.drillIndex, 2); assert.match(s.lessonText.setTextArgs[0], message);
  }
});

test('the end of a demonstration preserves a held movement key and a player charge already in progress', () => {
  const { s, mentor, body } = trainingFixture(2);
  s.wasd.D.isDown = true; s.hammerCharge.press(); s.hammerCharge.update(.05);
  s.beginPractice(); s.update(0, 16);
  assert.equal(s.phase, 'practice'); assert.equal(s.wasd.D.isDown, true); assert.equal(s.wasd.D.resets, 0);
  assert.equal(s.hammerCharge.holding, true); assert.equal(s.hammerCharge.elapsed, 50);
  assert.equal(body.velocity.x, 144); assert.equal(mentor.hammerCharge.holding, false);
});

test('an early success cannot be overwritten by the old demonstration or count twice', () => {
  const { s, mentor, advance } = trainingFixture(1);
  s.resolvePractice('quick', true); s.resolvePractice('quick', true);
  advance(900);
  assert.equal(s.phase, 'success'); assert.equal(s.drillIndex, 1); assert.equal(s.dummyHits || 0, 0);
  assert.equal(mentor.isSwinging, false);
  advance(120);
  assert.equal(s.drillIndex, 2); assert.equal(s.phase, 'demo'); assert.equal(s.attackInputLocked, false);
});
