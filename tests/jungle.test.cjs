const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.join(__dirname, '..');
class Rectangle {
  constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); }
  get right() { return this.x + this.width; }
  get bottom() { return this.y + this.height; }
}
const context = { Phaser: { Scene: class {}, Geom: { Rectangle, Intersects: {
  RectangleToRectangle: (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y,
} }, Input: { Keyboard: { JustDown: key => Boolean(key.justDown) } } } };
vm.createContext(context);
context.queueDragonClue = vm.runInNewContext(fs.readFileSync(path.join(root, 'src/utils/dragonStory.js'), 'utf8').replace(/export /g, '') + '\nqueueDragonClue;');
function load(file, replacement = '') {
  let code = fs.readFileSync(path.join(root, file), 'utf8').replace(/^import[\s\S]*?;\n/gm, '');
  if (replacement) code = code.replace(/export default class \w+/, 'globalThis.' + replacement + ' = class ' + replacement);
  code = code.replace(/export /g, ''); vm.runInContext(code, context);
}
load('src/utils/jungleRules.js');
load('src/utils/weapons.js');
load('src/utils/inventory.js'); context.saveProgress=()=>{};
load('src/utils/JungleHazards.js', 'Hazards');
load('src/scenes/jungle/JungleScene.js', 'JungleScene');
const rules = vm.runInContext('({ JUNGLE_BRANCHES, JUNGLE_PHYSICS, MONKEY_TYPES, JUNGLE_LEVELS })', context);

for(const [level,bonus] of [['Urwaldkronen',50],['Lianenpfad',25]])for(const completed of [false,true])
test(level+(completed?' replay has no completion bonus':' first victory pays a small completion bonus'),()=>{
  let save={coins:100,health:3,completedLevels:completed?[level]:[],unlockedLevels:['Urwaldkronen']};const labels=[];
  const art=()=>Object.assign(visual(),{setScrollFactor(){return this},setStrokeStyle(){return this},setInteractive(){return this},on(){return this}});
  const s=Object.create(context.JungleScene.prototype);
  Object.assign(s,{levelId:level,config:rules.JUNGLE_LEVELS[level],coins:100,health:3,
    inventory:{weapons:{sword:true},passives:{},consumables:{},companions:{default:true}},equipped:{weapon:'sword'},
    registry:{get:()=>save,set(_key,next){save=next}},physics:{world:{pause(){}}},swordHitbox:art(),hazards:{destroy(){}},hud:{setCoins(){}},
    input:{keyboard:{once(){}}},playJungleSound(){},scene:{start(){},restart(){}},
    add:{container(){return Object.assign(art(),{list:[],add(child){this.list.push(child);return this}})},rectangle:art,
      text(_x,_y,text){labels.push(text);return art()}}});
  s.finish(true);assert.equal(save.coins,100+(completed?0:bonus));assert.ok(save.completedLevels.includes(level));
  assert.equal(save.health,3);assert.equal(labels.some(text=>text.includes('+'+bonus+' Gold')),!completed);
  assert.ok(!labels.some(text=>text.includes('+0 Gold')));
  if(level==='Urwaldkronen')assert.ok(save.unlockedLevels.includes('UrwaldShop')&&save.unlockedLevels.includes('Lianenpfad'));
  s.finish(true);assert.equal(save.coins,100+(completed?0:bonus));
});

function visual(x = 0, y = 0) {
  return { x, y, active: true, angle: 0,
    setDisplaySize() { return this; }, setDepth() { return this; }, setOrigin() { return this; },
    setTint() { return this; }, clearTint() { return this; }, setFlipX() { return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setText(text) { this.text = text; return this; }, setTexture(key) { this.texture = key; return this; },
    setColor(color) { this.style = { ...this.style, color }; return this; },
    setVisible(value) { this.visible = value; return this; }, setSize() { return this; },
    setAlpha() { return this; }, destroy() { this.active = false; },
  };
}
function hazardScene(surfaces = [{ x: 0, y: 562, width: 960 }]) {
  const scene = { worldTime: 0, time: { now: 0 }, hits: [],
    player: { body: { x: 850, y: 500, width: 30, height: 62 } },
    add: { image: visual, ellipse: visual, circle: visual, text: visual },
    tweens: { add() {} }, takeJungleHit(damage) { this.hits.push(damage); },
  };
  const hazards = new context.Hazards(scene, surfaces);
  return { scene, hazards };
}
function step(scene, hazards, ms = 16) { scene.worldTime += ms; hazards.update(ms / 1000); }

test('branches allow jumping through from below but catch descending feet from above', () => {
  assert.equal(context.canLandOnBranch({ velocity: { y: -200 }, prev: { y: 460 }, height: 60 }, 480), false);
  assert.equal(context.canLandOnBranch({ velocity: { y: 100 }, prev: { y: 460 }, height: 60 }, 480), false);
  assert.equal(context.canLandOnBranch({ velocity: { y: 100 }, prev: { y: 415 }, height: 60 }, 480), true);
});

test('every branch including the boss perch is reachable with the normal jump, without shoes', () => {
  const { jumpSpeed, gravity, moveSpeed } = rules.JUNGLE_PHYSICS;
  const reached = new Set([0]);
  for (let pass = 0; pass < rules.JUNGLE_BRANCHES.length; pass++) {
    [...reached].forEach(i => rules.JUNGLE_BRANCHES.forEach((b, j) => {
      const a = rules.JUNGLE_BRANCHES[i], rise = a.y - b.y;
      const discriminant = jumpSpeed ** 2 - 2 * gravity * rise;
      if (rise <= 0 || discriminant < 0) return;
      const flight = (jumpSpeed + Math.sqrt(discriminant)) / gravity;
      const gap = Math.max(0, b.x - (a.x + a.width), a.x - (b.x + b.width));
      if (gap < flight * moveSpeed - 15) reached.add(j);
    }));
  }
  assert.equal(reached.size, rules.JUNGLE_BRANCHES.length);
});

test('coconuts follow gravity and reach the selected target along a ballistic arc', () => {
  for (const target of [{ x: 700, y: 450 }, { x: 100, y: 180 }, { x: 400, y: 550 }]) {
    const from = { x: 400, y: 320 }, v = context.ballisticVelocity(from, target);
    const t = target.x === from.x ? .65 : (target.x - from.x) / v.x;
    assert.ok(Math.abs(from.x + v.x * t - target.x) < .001);
    assert.ok(Math.abs(from.y + v.y * t + .5 * 850 * t * t - target.y) < .001);
  }
});

for (const [kind, damage] of [['brown', 1], ['red', 2], ['blue', 3]]) {
  test(`${kind} direct coconut hit deals exactly ${damage} damage once`, () => {
    const { scene, hazards } = hazardScene();
    hazards.throw(kind, { x: 860, y: 520 }, { x: 860, y: 530 });
    for (let i = 0; i < 40; i++) step(scene, hazards);
    assert.deepEqual(scene.hits, [damage]);
    assert.equal(hazards.projectiles.length, 0);
    assert.equal(hazards.puddles.length, 0);
  });
  test(`${kind} missed coconut bursts on a branch and ${kind === 'blue' ? 'leaves no' : 'leaves a'} sticky puddle`, () => {
    const { scene, hazards } = hazardScene([{ x: 100, y: 320, width: 300 }]);
    const p = hazards.throw(kind, { x: 200, y: 270 }, { x: 200, y: 320 }); p.vy = 250;
    for (let i = 0; i < 40; i++) step(scene, hazards);
    assert.equal(hazards.projectiles.length, 0);
    assert.equal(hazards.puddles.length, kind === 'blue' ? 0 : 1);
    assert.deepEqual(scene.hits, []);
    if (kind !== 'blue') assert.equal(hazards.puddles[0].y, 320);
  });
}

test('red coconut explodes over an area and does not double its direct hit', () => {
  const { scene, hazards } = hazardScene(); scene.player.body.x = 540;
  const p = hazards.throw('red', { x: 500, y: 500 }, { x: 500, y: 562 }); p.vy = 300;
  for (let i = 0; i < 40; i++) step(scene, hazards);
  assert.deepEqual(scene.hits, [2]); assert.equal(hazards.puddles.length, 1);
});

test('puddles last ten seconds while hero debuffs have an independent five-second countdown', () => {
  const { scene, hazards } = hazardScene();
  const puddle = hazards.addPuddle(400, 562);
  scene.worldTime = 4000; hazards.updatePuddles();
  assert.equal(puddle.label.text, 'Kleber · 6s');
  scene.worldTime = 4500; scene.player.body.x = 390; hazards.updatePuddles();
  assert.equal(hazards.slowUntil, 9500); assert.equal(hazards.isSticky(), true);
  scene.worldTime = 4990; hazards.updatePuddles();
  assert.equal(hazards.slowUntil, 9500, 'standing inside does not refresh on every frame');
  scene.worldTime = 10000; hazards.updatePuddles();
  assert.equal(hazards.puddles.length, 0); assert.equal(puddle.sprite.active, false);
  assert.equal(puddle.label.active, false); assert.equal(hazards.isSticky(), false);
  scene.worldTime = 9500; assert.equal(hazards.isSticky(), false);
});

test('jumping over a puddle is safe and re-entering it can renew the debuff', () => {
  const { scene, hazards } = hazardScene(); hazards.addPuddle(400, 562);
  scene.player.body = { x: 390, y: 400, width: 30, height: 60 }; hazards.updatePuddles();
  assert.equal(hazards.isSticky(), false);
  scene.player.body.y = 502; hazards.updatePuddles(); assert.equal(hazards.slowUntil, 5000);
  scene.worldTime = 1000; scene.player.body.x = 700; hazards.updatePuddles();
  scene.worldTime = 1500; scene.player.body.x = 390; hazards.updatePuddles();
  assert.equal(hazards.slowUntil, 6500);
});

test('paused gameplay freezes puddles and debuffs even if Phaser clock advances', () => {
  const { scene, hazards } = hazardScene(); const puddle = hazards.addPuddle(400, 562);
  scene.player.body.x = 390; hazards.updatePuddles(); scene.isPaused = true;
  scene.time.now = 9000; hazards.update(.05);
  assert.equal(hazards.isSticky(), true); assert.equal(puddle.sprite.active, true);
  assert.equal(hazards.slowUntil, 5000);
});

test('boss stones land, rotate, bounce at screen edges, and stop after three screen widths', () => {
  const { scene, hazards } = hazardScene(); scene.player.body.y = 0;
  const p = hazards.throw('stone', { x: 200, y: 500 }, { x: 600, y: 560 }); p.vy = 300;
  for (let i = 0; i < 1000 && hazards.projectiles.length; i++) step(scene, hazards);
  assert.equal(p.rolling, true); assert.ok(p.sprite.angle !== 0); assert.ok(p.bounces >= 2);
  assert.ok(p.rollDistance >= 2880 && p.rollDistance < 2886);
  assert.equal(hazards.projectiles.length, 0);
});

test('stones can be stunned and destroyed with melee attacks', () => {
  const { scene, hazards } = hazardScene();
  const p = hazards.throw('stone', { x: 200, y: 300 }, { x: 600, y: 550 });
  hazards.damageStone(p, 2); assert.equal(p.hp, 1);
  const x = p.x; step(scene, hazards, 50); assert.equal(p.x, x);
  hazards.damageStone(p, 2); assert.equal(hazards.projectiles.length, 0);
});

test('fast projectiles cannot pass through the player or a branch between frames', () => {
  const { scene, hazards } = hazardScene();
  const p = hazards.throw('blue', { x: 865, y: 420 }, { x: 865, y: 530 }); p.vy = 3000;
  step(scene, hazards, 50); assert.deepEqual(scene.hits, [3]);
});

function playableScene(sticky) {
  const scene = Object.create(context.JungleScene.prototype), key = () => ({ isDown: false, justDown: false });
  const body = { x: 100, y: 490, bottom: 562, width: 30, height: 72,
    velocity: { x: 0, y: 0 }, blocked: { down: true }, touching: { down: false },
    setVelocityX(x) { this.velocity.x = x; }, setVelocityY(y) { this.velocity.y = y; }, setSize() { return this; }, setOffset() { return this; } };
  Object.assign(scene, { worldTime: 0, lastGroundedAt: -1000, wasGrounded: true, isDucking: false,
    player: Object.assign(visual(130, 562), { body }), equipped: { weapon: 'sword' },
    cursors: { left: key(), right: key(), up: key(), down: key() },
    wasd: { W: key(), A: key(), S: key(), D: key() },
    hazards: { slowUntil: 5000, isSticky: () => sticky, update() {} }, stickyText: visual(),
    shield: { update() {} }, config: { boss: true },
    updateMonkeys() {}, updateSwing() {}, updateHelper() {}, playJungleSound() {},
  });
  scene.cursors.right.isDown = true; scene.cursors.up.justDown = true;
  return scene;
}
for (const sticky of [false, true]) {
  test(sticky ? 'sticky hero moves at 45% speed and cannot jump' : 'normal hero runs and jumps at full speed', () => {
    const scene = playableScene(sticky); scene.update(0, 16);
    assert.equal(scene.player.body.velocity.x, sticky ? 94.5 : 210);
    assert.equal(scene.player.body.velocity.y, sticky ? 0 : -480);
  });
}

test('hitting a monkey interrupts its throw and climbing until the stun ends', () => {
  const scene = Object.create(context.JungleScene.prototype);
  Object.assign(scene, { worldTime: 1000, playJungleSound() {} });
  const monkey = { active: true, hp: 3, kind: 'brown', sprite: visual(),
    warning: visual(), chargeUntil: 1400, nextThrowAt: 1200 };
  scene.damageMonkey(monkey, 1);
  assert.equal(monkey.hp, 2); assert.equal(monkey.chargeUntil, 0);
  assert.equal(monkey.stunnedUntil, 1500); assert.equal(monkey.nextThrowAt, 1900);
});

test('jungle boss has fixed openings, two hero hits and a separate helper hit, preventing stunlock', () => {
  const scene = Object.create(context.JungleScene.prototype);
  Object.assign(scene, { worldTime: 1000, playJungleSound() {} });
  const boss = { isBoss: true, active: true, awake: true, hp: 18, vulnerableUntil: 2300, hitsLeft: 2 };
  assert.equal(scene.damageMonkey(boss, 1), true); assert.equal(scene.damageMonkey(boss, 1), true);
  assert.equal(scene.damageMonkey(boss, 1), false); assert.equal(scene.damageMonkey(boss, 1, true), true);
  assert.equal(scene.damageMonkey(boss, 1, true), false); assert.equal(boss.hp, 15);
  assert.equal(boss.vulnerableUntil, 2300);
  scene.worldTime = 2300; boss.hitsLeft = 2; assert.equal(scene.damageMonkey(boss, 1), false);
});

test('restart and scene exit remove all hazards and countdown labels', () => {
  const { hazards } = hazardScene();
  const p = hazards.throw('brown', { x: 200, y: 300 }, { x: 400, y: 550 });
  const puddle = hazards.addPuddle(400, 562); hazards.slowUntil = 5000;
  hazards.destroy(); hazards.destroy();
  assert.equal(p.sprite.active, false); assert.equal(puddle.label.active, false);
  assert.equal(hazards.puddles.length, 0); assert.equal(hazards.projectiles.length, 0);
  assert.equal(hazards.slowUntil, 0);
});

test('new jungle scenes and art files are registered and the final underground boss unlocks the world', () => {
  load('src/utils/undergroundBoss.js');
  assert.equal(vm.runInContext('UNDERGROUND_BOSSES.Kristalltiefen.unlockWorld', context), 'jungle');
  assert.equal(vm.runInContext('UNDERGROUND_BOSSES.Kristalltiefen.unlock', context), 'Urwaldkronen');
  assert.equal(Object.keys(rules.JUNGLE_LEVELS).length, 2);
  for (const name of ['background', 'tree', 'monkeys', 'coconuts']) {
    assert.ok(fs.existsSync(path.join(root, 'assets/jungle/jungle-' + name + '.png')));
    assert.ok(fs.existsSync(path.join(root, 'assets/jungle/jungle-' + name + '.prompt.txt')));
  }
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  assert.ok(main.includes('JungleMapScene,')); assert.ok(main.includes('JungleScene,'));
});

test('monkeys telegraph audibly and play an attack sound on a throw that misses', () => {
  const scene = Object.create(context.JungleScene.prototype), sounds = [], throws = [];
  const monkey = { x: 235, y: 480, kind: 'brown', active: true, sprite: visual(),
    hp: 3, stunnedUntil: 0, nextClimbAt: 9000, nextThrowAt: 1000 };
  Object.assign(scene, { worldTime: 1000, monkeys: [monkey], boss: null,
    player: { x: 850, body: { center: { x: 850, y: 500 } } },
    add: { text: visual, image: visual }, playJungleSound: key => sounds.push(key),
    hazards: { throw: (...args) => throws.push(args) } });
  scene.updateMonkeys(.016);
  assert.equal(monkey.attackPhase, 'search'); assert.equal(throws.length, 0);
  scene.worldTime = monkey.searchUntil; scene.updateMonkeys(.016);
  assert.deepEqual(sounds, ['sfx-charging']); assert.equal(throws.length, 0);
  scene.worldTime = monkey.chargeUntil; scene.updateMonkeys(.016);
  assert.deepEqual(sounds, ['sfx-charging', 'sfx-monster-attack']); assert.equal(throws.length, 1);
});

test('a stunned monkey cannot produce an attack cue or throw', () => {
  const scene = Object.create(context.JungleScene.prototype), sounds = [];
  Object.assign(scene, { worldTime: 1000, boss: null, player: { body: { bottom: 600 } },
    monkeys: [{ active: true, stunnedUntil: 1500, nextThrowAt: 0 }],
    playJungleSound: key => sounds.push(key) });
  scene.updateMonkeys(.016); assert.deepEqual(sounds, []);
});

function kingScene() {
  const { scene, hazards } = hazardScene();
  Object.setPrototypeOf(scene, context.JungleScene.prototype);
  const boss = { x: 725, y: 165, kind: 'brown', sprite: visual(), active: true, isBoss: true,
    awake: true, hp: 18, maxHp: 18, throwCount: 0, nextThrowAt: 1000, nextClimbAt: 1e9,
    stunnedUntil: 0, vulnerableUntil: 0, hitsLeft: 0 };
  Object.assign(scene, { monkeys: [], boss, bossBar: {}, bossLabel: visual(), hazards,
    playJungleSound() {}, worldTime: 1000 });
  scene.player.x = 850;
  Object.assign(scene.player.body, { center: { x: 865, y: 531 }, bottom: 562 });
  scene.add.image = (x, y, key) => Object.assign(visual(x, y), { texture: key });
  scene.add.text = (x, y, text, style) => Object.assign(visual(x, y), { text, style });
  return { scene, boss, hazards };
}

test('the monkey king throws every coconut color and a stone in each complete attack cycle', () => {
  const { scene, boss, hazards } = kingScene(), thrown = [];
  for (let i = 0; i < 8; i++) {
    if (boss.attackPhase === 'release') { scene.worldTime = boss.releaseUntil; scene.updateMonkeys(0); }
    scene.worldTime = boss.nextThrowAt; scene.updateMonkeys(0);
    scene.worldTime = boss.searchUntil; scene.updateMonkeys(0);
    const preview = boss.throwPreview, warning = boss.warning, kind = boss.throwKind;
    assert.equal(preview.texture, kind === 'stone' ? 'underground-stonemonster-rolledup' : 'coconut-' + kind);
    assert.ok(warning.text.length > 1);
    scene.worldTime = boss.chargeUntil; scene.updateMonkeys(0);
    assert.equal(preview.active, false); assert.equal(warning.active, false);
    assert.equal(boss.throwPreview, null);
    const p = hazards.projectiles.at(-1); thrown.push(p.kind);
    // Actual projectiles emitted by the boss retain the corresponding damage behavior.
    p.x = 865; p.y = 531; p.vy = 0; hazards.updateProjectile(p, 0);
  }
  assert.deepEqual(thrown, ['brown', 'red', 'blue', 'stone', 'brown', 'red', 'blue', 'stone']);
  assert.deepEqual(scene.hits, [1, 2, 3, 1, 1, 2, 3, 1]);
  assert.equal(boss.throwCount, 8);
});

test('the king visibly warns of a red explosive coconut and a blue coconut before release', () => {
  for (const [count, kind, label, color] of [[1, 'red', 'EXPLOSIV!', '#ffaaa0'], [2, 'blue', 'BLAUE KOKOSNUSS!', '#a9dcff']]) {
    const { scene, boss, hazards } = kingScene(); boss.throwCount = count;
    scene.updateMonkeys(0);
    scene.worldTime = boss.searchUntil; scene.updateMonkeys(0);
    assert.equal(boss.throwKind, kind); assert.equal(boss.warning.text, label);
    assert.equal(boss.warning.style.color, color);
    assert.equal(boss.throwPreview.texture, 'coconut-' + kind);
    assert.equal(hazards.projectiles.length, 0);
  }
});

test('canceling a king throw removes both warning and projectile preview without advancing the sequence', () => {
  const { scene, boss, hazards } = kingScene(); boss.throwCount = 2; scene.updateMonkeys(0);
  scene.worldTime = boss.searchUntil; scene.updateMonkeys(0);
  const preview = boss.throwPreview, warning = boss.warning;
  scene.cancelCharge(boss);
  assert.equal(preview.active, false); assert.equal(warning.active, false);
  assert.equal(boss.chargeUntil, 0); assert.equal(boss.throwCount, 2); assert.equal(hazards.projectiles.length, 0);
  scene.updateMonkeys(0);scene.worldTime=boss.searchUntil;scene.updateMonkeys(0);assert.equal(boss.throwKind, 'blue');
});

for (const bossMode of [false, true]) test(`${bossMode ? 'king' : 'monkey'} locks its aim before windup; moving afterwards evades the intended landing spot`, () => {
  const { scene, boss: monkey, hazards } = kingScene();
  if (!bossMode) { monkey.isBoss = false; scene.boss = null; scene.monkeys = [monkey]; }
  scene.updateMonkeys(0); assert.equal(monkey.attackPhase, 'search');
  // Looking around can still discover a new target before the windup starts.
  scene.player.body.center.x = 900;
  scene.worldTime = monkey.searchUntil; scene.updateMonkeys(0);
  assert.equal(monkey.attackPhase, 'windup'); assert.equal(monkey.throwTarget.x, 900);
  const intended = { ...monkey.throwTarget }, handX = monkey.throwPreview.x;
  // Cross to the other side after the arm has been raised.
  scene.player.x = 540; scene.player.body.center.x = 540; scene.player.body.center.y = 490;
  scene.worldTime += 300; scene.updateMonkeys(0);
  assert.equal(monkey.throwPreview.x, handX); assert.equal(monkey.throwTarget.x, 900);
  assert.equal(hazards.projectiles.length, 0);
  scene.worldTime = monkey.chargeUntil; scene.updateMonkeys(0);
  const p = hazards.projectiles.at(-1), t = Math.max(.65, Math.min(1.3, Math.abs(intended.x - p.x) / 340));
  assert.ok(Math.abs(p.x + p.vx * t - intended.x) < .001);
  assert.ok(Math.abs(p.y + p.vy * t + 425 * t * t - intended.y) < .001);
  assert.ok(Math.abs(p.x + p.vx * t - scene.player.body.center.x) > 300);
  assert.equal(monkey.attackPhase, 'release');
});

test('hitting a normal monkey during windup clears its committed target and prevents the throw', () => {
  const { scene, boss: m, hazards } = kingScene(); m.isBoss = false; m.hp = 3; scene.boss = null; scene.monkeys = [m];
  scene.updateMonkeys(0); scene.worldTime = m.searchUntil; scene.updateMonkeys(0);
  assert.ok(m.throwTarget); const releaseAt = m.chargeUntil;
  scene.damageMonkey(m, 1); assert.equal(m.throwTarget, null); assert.equal(m.attackPhase, null);
  scene.worldTime = releaseAt; scene.updateMonkeys(0); assert.equal(hazards.projectiles.length, 0);
});
