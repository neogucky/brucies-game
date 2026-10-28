const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { EventEmitter } = require('node:events');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const strip = text => text.replace(/^import .*;\n/gm, '').replace(/export /g, '');
const bonus = vm.runInNewContext(strip(read('src/utils/bonusChallenges.js')) + '\n({BONUS_CHALLENGES,BONUS_DURATION,bonusState,unlockBonus,beginBonus,checkpointBonus,finishBonus,createBonusLayout});');
const discovery = vm.runInNewContext(strip(read('src/utils/mapDiscovery.js')) + '\n({planMapDiscovery});');
const plain = value => JSON.parse(JSON.stringify(value));
const fresh = () => ({ coins: 17, health: 3, unlockedLevels: [], completedLevels: [], bonusChallenges: {} });

for (const world of Object.keys(bonus.BONUS_CHALLENGES)) {
  test(world + ': a hidden switch unlocks one attempt without granting gold or changing health', () => {
    const save = fresh(), unlocked = bonus.unlockBonus(save, world);
    assert.equal(bonus.bonusState(save, world).status, 'locked'); assert.equal(bonus.beginBonus(save, world), null);
    assert.ok(unlocked.unlockedLevels.includes(bonus.BONUS_CHALLENGES[world].id));
    assert.equal(unlocked.coins, 17); assert.equal(unlocked.health, 3); assert.equal(save.unlockedLevels.length, 0);
    assert.equal(bonus.unlockBonus(unlocked, world), unlocked);
    assert.equal(bonus.bonusState(unlocked, world).remainingMs, 60000);
  });
  test(world + ': reload resumes the same clock and coins, with no duplicate pickup or new completion reward', () => {
    let save = bonus.beginBonus(bonus.unlockBonus(fresh(), world), world);
    const ids = bonus.createBonusLayout(world).coins.slice(0, 3).map(c => c.id);
    save = bonus.checkpointBonus(save, world, { remainingMs: 48000, collected: ids, x: 250, y: 350 });
    assert.equal(save.coins, 20);
    const resumed = bonus.beginBonus(plain(save), world), state = bonus.bonusState(resumed, world);
    assert.equal(state.remainingMs, 48000); assert.deepEqual(plain(state.collected), plain(ids)); assert.equal(state.x, 250);
    save = bonus.checkpointBonus(resumed, world, { remainingMs: 60000, collected: [...ids, ...ids, 'invalid'], x: 260, y: 355 });
    assert.equal(save.coins, 20); assert.equal(bonus.bonusState(save, world).remainingMs, 48000);
    save = bonus.finishBonus(save, world);
    assert.equal(save.coins, 20); assert.equal(save.health, 3);
    assert.equal(bonus.bonusState(save, world).status, 'complete'); assert.equal(bonus.beginBonus(save, world), null);
    assert.equal(bonus.unlockBonus(save, world), save); assert.equal(bonus.finishBonus(save, world), save);
    assert.equal(bonus.checkpointBonus(save, world, { collected: ids, remainingMs: 60000 }), save);
  });
  test(world + ': the hidden map destination reveals a connected path only after the switch is found', () => {
    const config = bonus.BONUS_CHALLENGES[world];
    const file = world === 'desert' ? 'src/scenes/DessertMapScene.js' : world === 'underground' ? 'src/scenes/UndergroundMapScene.js' : 'src/scenes/jungle/JungleMapScene.js';
    const code = read(file).replace(/^import .*;\n/gm, '').replace(/export default class (\w+)/, 'class $1').replace(/export /g, '');
    const nodes = vm.runInNewContext(code + '\n' + (world === 'jungle' ? 'JUNGLE_NODES' : 'NODES'), { Phaser: { Scene: class {} } });
    let save = { ...fresh(), unlockedLevels: [config.parent], mapReveals: { [world]: { nodes: [config.parent], paths: [] } } };
    const before = discovery.planMapDiscovery(save, world, nodes, [], new Set(save.unlockedLevels), config.parent);
    assert.equal(before.visibleNodes.has(config.id), false); assert.equal(before.steps.length, 0);
    save = bonus.unlockBonus(save, world);
    const after = discovery.planMapDiscovery(save, world, nodes, [], new Set(save.unlockedLevels), config.parent);
    assert.equal(after.visibleNodes.has(config.id), false); assert.equal(after.steps.length, 1);
    assert.equal(after.steps[0].newNode, config.id); assert.equal(after.steps[0].from.id, config.parent);
  });
  test(world + ': fixed coin IDs and reachable ledges survive loading without respawning collected gold', () => {
    const level = bonus.createBonusLayout(world), again = bonus.createBonusLayout(world);
    const count = world === 'underground' ? 102 : 90;
    assert.deepEqual(plain(level), plain(again)); assert.equal(level.coins.length, count);
    assert.equal(new Set(level.coins.map(c => c.id)).size, count);
    for (const coin of level.coins) { assert.ok(coin.x > 0 && coin.x < level.width); assert.ok(coin.y > 0 && coin.y < level.height); }
    let previous = level.platforms[0];
    for (const shelf of level.platforms.slice(1)) {
      assert.ok(previous.y - shelf.y <= 145, 'each upward step fits a normal jump');
      const gap = Math.max(0, shelf.x - previous.x - previous.width, previous.x - shelf.x - shelf.width);
      assert.ok(gap <= 200, 'no impossible sideways jump'); previous = shelf;
    }
  });
}

test('worlds have different courses: long desert route, spring platforms in the cave, and climbable jungle vines', () => {
  const d = bonus.createBonusLayout('desert'), u = bonus.createBonusLayout('underground'), j = bonus.createBonusLayout('jungle');
  assert.ok(d.width > u.width); assert.ok(j.height > u.height && u.height > d.height);
  assert.ok(u.platforms.some(p => p.spring)); assert.equal(d.vines.length, 0); assert.equal(j.vines.length, 2);
});

test('using a test unlock does not restore a consumed attempt; other worlds keep their own attempt', () => {
  let save = bonus.beginBonus(bonus.unlockBonus(fresh(), 'desert'), 'desert'); save = bonus.finishBonus(save, 'desert');
  save = bonus.unlockBonus(save, 'jungle');
  assert.equal(bonus.bonusState(save, 'desert').status, 'complete'); assert.equal(bonus.bonusState(save, 'jungle').status, 'ready');
  assert.equal(bonus.beginBonus({ ...save, unlockedLevels: Object.values(bonus.BONUS_CHALLENGES).map(c => c.id) }, 'desert'), null);
});

const sceneCtx = vm.createContext({ ...bonus, Phaser: { Scene: class {} }, performance: { now: () => sceneCtx.now } });
vm.runInContext(read('src/scenes/CoinChallengeScene.js').replace(/^import .*;\n/gm, '')
  .replace('export default class CoinChallengeScene', 'globalThis.Challenge = class CoinChallengeScene'), sceneCtx);

test('the active challenge uses real elapsed time and expires before any later pickup can be banked', () => {
  const s = new sceneCtx.Challenge(); let finished = 0;
  Object.assign(s, { lastFrameAt: 1000, remainingMs: 50, running: true, updateHud() {}, finish() { finished++; } });
  Object.defineProperty(s, 'coinSprites', { get() { throw new Error('no pickup after timeout'); } });
  sceneCtx.now = 1100; s.update(); assert.equal(s.remainingMs, 0); assert.equal(finished, 1);
});

test('dialogs pause the countdown; the preparation countdown does not consume the sixty seconds', () => {
  const s = new sceneCtx.Challenge(); let resumed = 0;
  Object.assign(s, { lastFrameAt: 1000, remainingMs: 60000, counting: true, countdownMs: 3000,
    countdownText: { setText() {}, destroy() {} }, player: { body: { setAllowGravity() {} } },
    physics: { resume() { resumed++; } }, sound: { play() {} } });
  sceneCtx.now = 2000; s.update(); assert.equal(s.countdownMs, 2000); assert.equal(s.remainingMs, 60000);
  s.isPaused = true; sceneCtx.now = 22000; s.update(); assert.equal(s.countdownMs, 2000);
  s.isPaused = false; sceneCtx.now = 24000; s.update(); assert.equal(resumed, 1); assert.equal(s.running, true); assert.equal(s.remainingMs, 60000);
});

function switchFixture(world, discovered = false, gender = 'male') {
  let save = discovered ? bonus.unlockBonus(fresh(), world) : fresh(), writes = 0;
  save.playerGender = gender;
  const soundKeys = [], order = [], texts = [], graphics = [], keyboard = new EventEmitter();
  const config = bonus.BONUS_CHALLENGES[world], {x,y} = config.lever;
  function art(x = 0, y = 0, key = '') {
    const target = { x, y, active: true, visible: true, list: [], texture: { key }, handlers: {},
      add(objects) { this.list.push(...(Array.isArray(objects) ? objects : [objects])); return proxy; },
      setVisible(value) { this.visible = value; return proxy; }, setAlpha(value) { this.alpha = value; return proxy; },
      setPosition(x, y) { this.x = x; this.y = y; return proxy; }, setTint(value) { this.tint = value; return proxy; },
      setTexture(key) { this.texture.key = key; return proxy; },
      setDepth(value) { this.depth = value; return proxy; },
      setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return proxy; },
      setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return proxy; },
      setRotation(value) { this.rotation = value; return proxy; },
      on(event, handler) { this.handlers[event] = handler; return proxy; },
      destroy() { this.active = false; this.list.forEach(child => child.destroy()); },
    };
    const proxy = new Proxy(target, { get: (o, k) => k in o ? o[k] : () => proxy }); return proxy;
  }
  const cover = art(x,y+6); cover.displayWidth=92;cover.displayHeight=72;
  cover.getBounds = () => ({x:cover.x-cover.displayWidth/2,right:cover.x+cover.displayWidth/2,y:cover.y-cover.displayHeight,bottom:cover.y});
  const wall = {active:false,getBounds:()=>({x:x-30,right:x-20,y:y-60,bottom:y+5})};
  const frames = id => Array.from({ length: 13 }, () => ({ key: id, shoulder: { x: 15, y: -62 } }));
  const assets = { bodies: { 'male-stand': frames('knight'), 'female-stand': frames('knight-female') },
    parts: {
      upper: {key:'upper', originX:.81, originY:.63, length:355, height:305, angle:0},
      forearm: {key:'forearm', originX:.87, originY:.51, length:388, height:220, angle:0},
      hand: {key:'hand', originX:.43, originY:.48, length:150, height:277, angle:0, wristRatio:155/150},
    } };
  const data = {};
  const scene = {
    player: Object.assign(art(), { getData: key => data[key], setData(key, value) { data[key] = value; },
      body:{center:{x:x-60},bottom:y,setVelocity(){}} }), isPaused:true,time:{now:1000,delayedCall(){}},
    registry:{get:key=>key==='saveData'?save:key==='melee-animation-assets'?assets:null,set:(_key,next)=>{save=next;}},
    add:{graphics:()=>{const g=art();graphics.push(g);return g;},image:(x,y,key)=>key===config.cover.texture?Object.assign(cover,{x,y}):art(x,y,key),
      zone:art,container:art,rectangle:art,ellipse:art,text(x,y,text){const item=art(x,y);item.text=text;texts.push(item);return item;}},
    blockMap:new Map([['12,3',cover]]),
    blocks:{getChildren:()=>[cover,wall],remove(block){block.destroy();}},
    input:{keyboard},events:{on(){},once(){},off(){}},
    physics:{world:{isPaused:false,pause(){this.isPaused=true;},resume(){this.isPaused=false;}}},
    tweens:{pauseAll(){this.paused=true;},resumeAll(){this.paused=false;}},
    cameras:{main:{shake(){order.push('shake');}}},
    sound:{sounds:[],play(key){soundKeys.push(key);order.push(key);},add(key){return{play(){soundKeys.push(key);order.push(key);},stop(){},destroy(){}};}},
  };
  if (world !== 'underground') scene.blocks = null;
  const context = vm.createContext({...bonus,saveProgress(){writes++;order.push('unlock');},resetSceneKeys(){}});
  vm.runInContext(strip(read('src/utils/LeverVisual.js')).replace('default class LeverVisual','globalThis.LeverVisual = class LeverVisual'), context);
  vm.runInContext(strip(read('src/utils/LeverInteraction.js')).replace('default class LeverInteraction','globalThis.LeverInteraction = class LeverInteraction'), context);
  const Switch = vm.runInContext(read('src/utils/SecretSwitch.js').replace(/^import .*;\n/gm,'')
    .replace('export default class SecretSwitch','class SecretSwitch')+'\nSecretSwitch;', context);
  const lever = new Switch(scene,world);
  const advance = ms => { for(let left=ms;left>0;left-=25){const dt=Math.min(25,left);if(!scene.time.paused)scene.time.now+=dt;lever.update(0,dt);} };
  return {scene,lever,graphic:lever.visual,cover,wall,keyboard,soundKeys,order,texts,context,advance,
    save:()=>save,writes:()=>writes,sounds:()=>soundKeys.length,pointer:()=>lever.zone.handlers.pointerdown()};
}

test('the cave switch is in upper central earth, away from the starting path',()=>{
  const config=bonus.BONUS_CHALLENGES.underground, map=JSON.parse(read('assets/levels/underground_dig.json'));
  const tile=map.blocks.find(b=>b.col===config.cover.col&&b.row===config.cover.row);
  assert.equal(tile.type,'earth');assert.ok(config.cover.row<map.start.row-5);
  assert.equal(config.lever.x,(config.cover.col+.5)*map.tileSize);
  assert.equal(config.lever.y,(config.cover.row+1)*map.tileSize);
});

for (const [world, playerDepth] of [['desert',5], ['underground',0], ['jungle',20]]) {
  test(world + ': painted lever stays behind the knight and its grip follows the hinge without a ground marker',()=>{
    const f=switchFixture(world),visual=f.lever.visual;
    assert.ok(visual.base.depth<playerDepth);assert.ok(visual.arm.depth<playerDepth);
    assert.equal(f.lever.clearing,undefined);assert.equal(f.lever.coverClue,undefined);
    for(const progress of [0,.25,.5,.75,1]) {
      const handle=f.context.leverHandle(visual.x,visual.y,progress),{pivot,grip}=visual.skin.arm;
      visual.draw(handle);
      const dx=(grip[0]-pivot[0])*visual.arm.scaleX,dy=(grip[1]-pivot[1])*visual.arm.scaleY,a=visual.arm.rotation;
      assert.ok(Math.hypot(visual.pivot.x+dx*Math.cos(a)-dy*Math.sin(a)-handle.x,
        visual.pivot.y+dx*Math.sin(a)+dy*Math.cos(a)-handle.y)<.001);
      const baseBottom=visual.pivot.y+(visual.skin.base.frame[3]-visual.skin.base.pivot[1])*visual.base.scaleY;
      assert.ok(Math.abs(baseBottom-visual.y)<.001,'the painted stone base stays planted on the same ground');
    }
    assert.ok(visual.arm.scaleX>visual.arm.scaleY*2,'the small gameplay view has a stronger painted silhouette');
    const closeup=new f.context.LeverVisual(f.scene,world,570,432,1.75,f.scene.add.container());
    closeup.draw(f.context.leverHandle(570,432,.5,1.75));
    assert.equal(closeup.arm.scaleX,closeup.arm.scaleY,'closeup artwork retains its original proportions');
  });
}

test('earth conceals the switch until dug away; loading and intervening walls prevent activation',()=>{
  const f=switchFixture('underground'),{scene,lever,graphic,cover,wall}=f;
  assert.equal(cover.tint,bonus.BONUS_CHALLENGES.underground.cover.tint);assert.equal(graphic.visible,false);
  scene.isPaused=false;scene.isLoading=true;lever.update();f.pointer();assert.equal(f.writes(),0);
  scene.isLoading=false;lever.update();assert.equal(lever.covered,true);assert.equal(lever.clear,false);f.pointer();assert.equal(f.writes(),0);
  cover.destroy();wall.active=true;lever.update();assert.equal(graphic.visible,true);assert.equal(lever.clear,false);
  f.pointer();assert.equal(f.writes(),0,'a nearby uncovered switch still cannot be used through a solid wall');
  wall.active=false;scene.player.body.center.x=bonus.BONUS_CHALLENGES.underground.lever.x;lever.update();
  f.advance(700);assert.equal(bonus.bonusState(f.save(),'underground').status,'locked');
  f.pointer();assert.equal(f.writes(),0);assert.equal(scene.isInteractingWithLever,true);
  f.advance(2600);assert.equal(bonus.bonusState(f.save(),'underground').status,'ready');assert.equal(f.save().coins,17);
  lever.update();f.pointer();assert.equal(f.writes(),1);
  assert.deepEqual(f.soundKeys,['sfx-key-open','sfx-stone-scrape']);
  scene.player.body.center.x=900;scene.player.body.bottom=500;lever.update();assert.equal(graphic.visible,true,'the lever remains visible at a distance');
});

for(const world of ['desert','jungle'])test(world+': a visible unusual plant must be struck before the switch works',()=>{
  const f=switchFixture(world),{scene,cover,lever,graphic}=f,{x,y}=bonus.BONUS_CHALLENGES[world].lever;
  scene.isPaused=false;scene.player.body.center.x=x;lever.update();f.pointer();
  assert.equal(cover.active,true);assert.equal(graphic.visible,world==='desert');assert.equal(f.writes(),0);
  if(world==='desert'){
    const bounds=cover.getBounds();
    assert.ok(y>500&&x>300&&x<600,'the secret is on the quiet lower edge');
    assert.ok(bounds.x<x-25&&bounds.right>x+25&&bounds.y<y-55&&bounds.bottom>y,'the bush covers the mechanism');
    assert.ok(cover.alpha>.7&&cover.alpha<.9,'the mechanism can be glimpsed through the leaves');
    assert.equal(lever.zone.visible,false);
  }
  scene.isSwinging=true;scene.swingReadyAt=1100;
  scene.getMeleeBounds=()=>({x:x-20,y:y-50,width:40,height:40});
  lever.update();assert.equal(cover.active,true,'winding up a weapon does not remove the plant');
  scene.time.now=1200;lever.update();assert.equal(cover.active,false);assert.equal(graphic.visible,true);
  assert.equal(bonus.bonusState(f.save(),world).status,'locked');assert.equal(f.writes(),0);
  f.pointer();assert.equal(scene.isInteractingWithLever,undefined,'striking the cover cannot also pull the lever');
  scene.isSwinging=false;f.advance(700);f.keyboard.emit('keydown-ENTER');assert.equal(f.writes(),0);
  f.advance(2600);assert.equal(bonus.bonusState(f.save(),world).status,'ready');assert.equal(f.writes(),1);
  lever.update();assert.equal(f.writes(),1);
});

test('the knight pulls first, then the world shakes and scrapes, and only then the passage is unlocked',()=>{
  const f=switchFixture('desert');f.scene.isPaused=false;f.cover.destroy();f.lever.update();f.advance(1000);
  assert.equal(f.writes(),0,'being beside the revealed lever does not activate it');
  f.pointer();assert.equal(f.scene.isPaused,true);assert.equal(f.scene.time.paused,true);assert.equal(f.scene.physics.world.isPaused,true);
  assert.equal(f.scene.tweens.paused,true);assert.equal(f.scene.player.visible,false);assert.equal(f.writes(),0);
  f.advance(1575);assert.deepEqual(f.order,[]);assert.equal(f.texts.some(t=>t.text.startsWith('Geheimgang geöffnet')),false);
  f.advance(25);assert.deepEqual(f.order,['sfx-key-open','sfx-stone-scrape','shake']);assert.equal(f.writes(),0);
  f.advance(1000);assert.equal(f.writes(),1);assert.equal(f.order.at(-1),'unlock');
  assert.equal(f.scene.isPaused,false);assert.equal(f.scene.time.paused,undefined);assert.equal(f.scene.physics.world.isPaused,false);
  assert.equal(f.scene.tweens.paused,false);assert.equal(f.scene.player.visible,true);assert.equal(f.scene.isInteractingWithLever,false);
  assert.equal(f.texts.some(t=>t.text.startsWith('Geheimgang geöffnet')),true);
});

for(const world of ['desert','underground','jungle'])for(const gender of ['male','female']) {
  test(world+' / '+gender+': normal arm lengths stay constant and the gauntlet holds the handle throughout the pull',()=>{
    const f=switchFixture(world,false,gender);f.scene.isPaused=false;f.cover.destroy();f.lever.update();f.advance(700);f.pointer();
    const interaction=f.lever.interaction;
    for(let elapsed=0;elapsed<=1700;elapsed+=25){
      if(elapsed)f.advance(25);
      const a=interaction.actor,{shoulder,elbow,wrist}=a.pose;
      assert.ok(Math.abs(Math.hypot(elbow.x-shoulder.x,elbow.y-shoulder.y)-14*1.25/.6)<.001,'upper arm never shrinks');
      assert.ok(Math.abs(Math.hypot(wrist.x-elbow.x,wrist.y-elbow.y)-15*1.25/.6)<.001,'forearm never shrinks');
      assert.ok(Math.abs(Math.abs(a.upper.scaleX)*a.parts.upper.length-14*1.25/.6)<.001);
      assert.ok(Math.abs(Math.abs(a.forearm.scaleX)*a.parts.forearm.length-15*1.25/.6)<.001);
      // Use actual atlas dimensions: checking only bone lengths previously
      // missed sleeves squeezed to half their normal armor thickness.
      assert.ok(a.upper.scaleY*a.parts.upper.height>=25,'upper armor stays broad enough for the body');
      assert.ok(a.forearm.scaleY*a.parts.forearm.height>=20,'forearm armor cannot become a thin tube');
      assert.ok(a.hand.scaleY*a.parts.hand.height>=19,'gauntlet matches the broad wrist');
      if(elapsed>=600){
        const handle=interaction.lever.handle;
        assert.ok(Math.hypot(a.grip.x-handle.x,a.grip.y-handle.y)<.001,'hand grips the real painted handle');
      }
    }
    assert.equal(interaction.actor.body.texture.key,gender==='female'?'knight-female':'knight');
    assert.equal(interaction.actor.images.length,4,'there is no weapon sprite in the lever pose');
    assert.ok(interaction.container.list.indexOf(interaction.lever.arm)<interaction.container.list.indexOf(interaction.actor.body),
      'the whole knight stands in front of the lever in the closeup too');
  });
}

test('leaving during the animation restores the game and cannot unlock a passage later',()=>{
  const f=switchFixture('desert');f.scene.isPaused=false;f.cover.destroy();f.lever.update();f.advance(700);f.pointer();f.advance(1000);
  f.lever.destroy();assert.equal(f.writes(),0);assert.equal(f.scene.isPaused,false);
  assert.equal(f.scene.isInteractingWithLever,false);assert.equal(f.scene.player.visible,true);
  assert.equal(f.keyboard.listenerCount('keydown-ENTER'),0);assert.equal(f.lever.interaction,null);
});

test('canceling a cutaway after Phaser shuts down cannot access already destroyed enemy groups',()=>{
  const f=switchFixture('desert');f.scene.isPaused=false;f.cover.destroy();f.lever.update();f.advance(700);f.pointer();
  f.scene.sys={isActive:()=>false};
  f.scene.monsters={getChildren(){throw new Error('The group has already been destroyed');}};
  f.scene.physics.world=null;f.scene.tweens=null;
  assert.doesNotThrow(()=>f.lever.destroy());assert.equal(f.writes(),0);
  assert.notEqual(f.scene.time.paused,true,'restarting this scene must not inherit the cutaway clock pause');
});

test('the real-time clock cannot expire enemy attacks, shield recharge or desert play time during the cutaway',()=>{
  const f=switchFixture('desert');f.scene.isPaused=false;f.cover.destroy();f.lever.update();f.advance(700);
  f.scene.endlessStartAt=900;f.scene.shield={cooldownUntil:9000,cooldownStartedAt:1000};
  const values={nextAttackAt:2400,stunnedUntil:0,rollDir:1,hp:5};
  f.scene.monsters={getChildren:()=>[{data:{values}}]};
  f.pointer();const before=f.scene.time.now;f.scene.time.now+=2600;f.advance(2600);
  assert.equal(f.scene.time.now-before,2600);
  assert.equal(f.scene.endlessStartAt,3500);assert.equal(values.nextAttackAt,5000);
  assert.equal(values.stunnedUntil,0);assert.equal(values.rollDir,1);assert.equal(values.hp,5);
  assert.equal(f.scene.shield.cooldownUntil,11600);assert.equal(f.scene.shield.cooldownStartedAt,3600);
});

test('jungle world-time deadlines stay unchanged while its shield still follows the real-time clock',()=>{
  const f=switchFixture('jungle');f.scene.worldTime=500;f.scene.helperNextAt=700;
  f.scene.shield={cooldownUntil:9000,cooldownStartedAt:1000};
  f.context.resumeLeverClocks(f.scene,2600);
  assert.equal(f.scene.worldTime,500);assert.equal(f.scene.helperNextAt,700);
  assert.equal(f.scene.shield.cooldownUntil,11600);
});

test('finishing the animation does not resume a tween that was already paused before the lever was used',()=>{
  const f=switchFixture('desert');f.scene.isPaused=false;f.cover.destroy();f.lever.update();f.advance(700);
  const tweens=[{paused:false,resume(){this.paused=false;}},{paused:true,resume(){this.paused=false;}}];
  f.scene.tweens={paused:false,getTweens:()=>tweens,pauseAll(){this.paused=true;},resumeAll(){this.paused=false;}};
  f.pointer();f.advance(2600);
  assert.equal(tweens[0].paused,false);assert.equal(tweens[1].paused,true);
  assert.equal(f.scene.tweens.paused,false,'the manager itself must run again');
});

for(const world of ['desert','underground','jungle'])test(world+': an emerging mole animation continues after the cutaway and can finish',()=>{
  const f=switchFixture(world);f.scene.isPaused=false;f.cover.destroy();f.lever.update();f.advance(700);
  const mole={emerging:true,alpha:.4},tween={elapsed:700,paused:false};
  const manager={paused:false,getTweens:()=>[tween],pauseAll(){this.paused=true;},resumeAll(){this.paused=false;},
    step(ms){if(this.paused||tween.paused)return;tween.elapsed+=ms;mole.alpha=Math.min(1,tween.elapsed/2000);if(tween.elapsed>=2000)mole.emerging=false;}};
  f.scene.tweens=manager;f.pointer();manager.step(2600);
  assert.equal(tween.elapsed,700);assert.equal(mole.emerging,true);
  f.advance(2600);assert.equal(manager.paused,false);
  manager.step(1299);assert.equal(mole.emerging,true);
  manager.step(1);assert.equal(mole.emerging,false);assert.equal(mole.alpha,1);
});

test('an intentionally paused animation manager stays paused after the cutaway',()=>{
  const f=switchFixture('desert');f.scene.isPaused=false;f.cover.destroy();f.lever.update();f.advance(700);
  f.scene.tweens.paused=true;f.pointer();f.advance(2600);assert.equal(f.scene.tweens.paused,true);
});

test('a discovered cave switch is uncovered on revisits without granting a second attempt or playing a digging sound',()=>{
  const f=switchFixture('underground',true);
  assert.equal(f.cover.active,false);assert.equal(f.graphic.visible,true);assert.equal(f.scene.blockMap.has('12,3'),false);
  assert.equal(f.writes(),0);assert.equal(f.sounds(),0);
});

test('the two new cave shelves preserve all ninety old coin IDs and migrate a running position only once',()=>{
  const layout=bonus.createBonusLayout('underground'),ids=new Set(layout.coins.map(c=>c.id));
  assert.equal(layout.platforms.length,15);assert.ok(layout.coins.some(c=>c.id==='s12:0'));assert.ok(layout.coins.some(c=>c.id==='s13:5'));
  for(let row=0;row<12;row++)for(let col=0;col<6;col++)assert.ok(ids.has('s'+row+':'+col));
  for(let i=0;i<18;i++)assert.ok(ids.has('g:'+i));
  const save={...fresh(),bonusChallenges:{underground:{status:'running',remainingMs:37000,collected:['s2:0','g:1'],x:340,y:900}}};
  const resumed=bonus.beginBonus(save,'underground'),state=bonus.bonusState(resumed,'underground');
  assert.equal(state.y,1110);assert.equal(state.remainingMs,37000);assert.deepEqual(plain(state.collected),['s2:0','g:1']);
  assert.equal(bonus.bonusState(bonus.beginBonus(plain(resumed),'underground'),'underground').y,1110);
});

for(const world of Object.keys(bonus.BONUS_CHALLENGES))test(world+': collecting every coin saves the elapsed record and never grants a new attempt',()=>{
  let save=bonus.beginBonus(bonus.unlockBonus(fresh(),world),world);
  save=bonus.checkpointBonus(save,world,{remainingMs:19000,collected:bonus.createBonusLayout(world).coins.map(c=>c.id)});
  const count=bonus.createBonusLayout(world).coins.length;
  assert.equal(save.coins,17+count);
  save=bonus.finishBonus(save,world);
  const state=bonus.bonusState(plain(save),world);
  assert.equal(state.allCollected,true);assert.equal(state.recordMs,41000);assert.equal(state.elapsedMs,41000);
  assert.equal(state.remainingMs,0);assert.equal(bonus.beginBonus(save,world),null);assert.equal(bonus.finishBonus(save,world),save);
});

test('an incomplete run does not receive a speed record',()=>{
  let save=bonus.beginBonus(bonus.unlockBonus(fresh(),'underground'),'underground');
  save=bonus.checkpointBonus(save,'underground',{remainingMs:19000,collected:['g:0']});
  const state=bonus.bonusState(bonus.finishBonus(save,'underground'),'underground');
  assert.equal(state.allCollected,false);assert.equal(state.recordMs,undefined);assert.equal(state.elapsedMs,41000);
});

function jumper(){
  const s=new sceneCtx.Challenge(),body={blocked:{down:true},touching:{down:true},bottom:400,x:160,right:190,
    position:{y:340},height:60,prev:{y:340},velocity:{x:0,y:0},updateCenter(){}};
  const ledge={bonusSurfaceY:400,body:{top:400,x:100,right:400}};
  Object.assign(s,{running:true,time:{now:1000},dropUntil:0,lastDownAt:-1000,nextSpring:0,player:{y:400,body,setVelocityY(v){body.velocity.y=v;}},
    platforms:{getChildren:()=>[ledge]},sound:{play(){}},tweens:{add(){}}});
  return {s,body,ledge};
}

test('double Down drops through just the current platform; single Down and the floor remain solid',()=>{
  const {s,body,ledge}=jumper();
  assert.equal(s.tryDropThrough(),false);assert.equal(s.canLandOnLedge(ledge),true);
  s.time.now+=180;assert.equal(s.tryDropThrough(),true);assert.equal(body.velocity.y,120);assert.equal(s.canLandOnLedge(ledge),false);
  assert.equal(s.canLandOnLedge({bonusSurfaceY:505,body:{top:505}}),true);
  assert.equal(s.canLandOnLedge({bonusSpring:true,bonusDropThroughY:400,bonusSurfaceY:363,body:{top:363}}),false);
  s.time.now+=500;assert.equal(s.canLandOnLedge(ledge),true);
  const floor=jumper();floor.ledge.bonusFloor=true;floor.s.tryDropThrough();floor.s.time.now+=100;assert.equal(floor.s.tryDropThrough(),false);
});

test('spring caps propel the player upward with one Boing, respect cooldown, and ignore ordinary ledges',()=>{
  const {s,body,ledge}=jumper(),sounds=[];s.sound.play=key=>sounds.push(key);
  assert.equal(s.bounceFromSpring(ledge),false);ledge.bonusSpring=true;
  assert.equal(s.bounceFromSpring(ledge),true);assert.equal(body.velocity.y,-660);assert.deepEqual(sounds,['sfx-spring']);
  assert.equal(s.bounceFromSpring(ledge),false);assert.equal(sounds.length,1);
  s.time.now+=301;assert.equal(s.bounceFromSpring(ledge),true);assert.equal(sounds.length,2);
});

test('the last real pickup plays Pling and finishes immediately with time left on the clock',()=>{
  const {s,body}=jumper(),sounds=[];let persisted=0,finished=0;
  sceneCtx.Phaser.Input={Keyboard:{JustDown:()=>false}};sceneCtx.now=2000;
  Object.assign(s,{lastFrameAt:1984,remainingMs:19016,collected:new Set(['first']),layout:{coins:[{id:'first'},{id:'last'}],vines:[]},
    cursors:{left:{},right:{},up:{},down:{}},wasd:{A:{},D:{},W:{},S:{}},climbing:null,
    coinSprites:[{id:'last',x:175,y:370,sprite:{active:true,destroy(){this.active=false;}}}],
    persist(){persisted++;},finish(){finished++;},updateHud(){},sound:{play(key){sounds.push(key);}}});
  body.center={x:175,y:370};body.setAllowGravity=()=>{};s.player.setVelocityX=()=>{};s.player.setTexture=()=>{};
  s.update();assert.equal(s.remainingMs,19000);assert.equal(persisted,1);assert.equal(finished,1);assert.deepEqual(sounds,['sfx-coin']);
});

test('the record remains visible after reopening a completed challenge',()=>{
  const {s}=jumper();let title,text;
  const save={...fresh(),bonusChallenges:{underground:{status:'complete',allCollected:true,recordMs:41000,collected:[]}}};
  Object.assign(s,{bonusWorld:'underground',collected:new Set(Array.from({length:102},(_,i)=>i)),physics:{pause(){}},
    registry:{get:()=>save},panel(a,b){title=a;text=b;}});s.player.setVelocity=()=>{};
  s.showResult();assert.equal(title,'Alles eingesammelt!');assert.match(text,/Rekord: 41 Sekunden/);
});

for(const world of Object.keys(bonus.BONUS_CHALLENGES))test(world+': overlay buttons keep their visible hit positions when the camera scrolls',()=>{
  function ui(x=0,y=0,text=''){
    return {x,y,text,list:[],scrollFactorX:1,scrollFactorY:1,setOrigin(){return this;},setDepth(){return this;},setStrokeStyle(){return this;},
      setScrollFactor(value){this.scrollFactorX=this.scrollFactorY=value;return this;},setInteractive(){this.interactive=true;return this;},
      add(child){this.list.push(child);return this;},on(event,fn){this[event]=fn;return this;},destroy(){}};
  }
  const s=new sceneCtx.Challenge(),destinations=[];let starts=0;
  Object.assign(s,{bonusWorld:world,config:bonus.BONUS_CHALLENGES[world],collected:new Set(['g:0']),remainingMs:0,
    add:{container:ui,rectangle:ui,text:ui},physics:{pause(){}},player:{setVelocity(){}},registry:{get:()=>({})},
    scene:{start:key=>destinations.push(key)},startAttempt(){starts++;}});
  const scroll={x:world==='desert'?1200:0,y:world==='desert'?80:1190};
  function click(text){
    const button=s.overlay.list.find(child=>child.interactive&&typeof child.text==='string'&&child.text.startsWith(text));assert.ok(button,text);
    const pointerX=button.x+scroll.x-scroll.x*(1-button.scrollFactorX);
    const pointerY=button.y+scroll.y-scroll.y*(1-button.scrollFactorY);
    assert.equal(pointerX,button.x);assert.equal(pointerY,button.y);
    button.pointerdown();
  }
  s.showResult();click('Zur Weltkarte');assert.deepEqual(destinations,[s.config.map]);
  s.levelCompleted=false;s.showWelcome(false);click('Los geht’s');assert.equal(starts,1);
  click('Zur Weltkarte');assert.deepEqual(destinations,[s.config.map,s.config.map]);
  s.showLocked();click('Zur Weltkarte');assert.equal(destinations.length,3);
});
