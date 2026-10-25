const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const { EventEmitter } = require('node:events');
const ctx = vm.createContext({ Phaser: { Scene: class {} } });
function load(file, name) {
  let code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/^import[\s\S]*?;\n/gm, '');
  if (name) code = code.replace(/export default class \w+/, `globalThis.${name} = class ${name}`);
  vm.runInContext(code.replace(/export /g, ''), ctx);
}
load('src/utils/worldMapRoutes.js'); load('src/utils/WorldMapTravel.js', 'WorldMapTravel');
load('src/utils/companionDrinking.js'); load('src/scenes/jungle/JungleScene.js', 'JungleScene');
const exits = vm.runInContext('WORLD_MAP_EXITS', ctx);
const foot = ctx.mapFoot, route = ctx.getWorldMapRoute, point = ctx.pointOnMapRoute;
const pairs = [
  ['desert', {id:'Wuestenruine',x:180,y:490}, {id:'Taverne',x:420,y:410}],
  ['underground', {id:'Schluesseltor',x:338,y:340}, {id:'Kristalltiefen',x:690,y:450}],
  ['jungle', {id:'UrwaldShop',x:220,y:360}, {id:'Urwaldkronen',x:485,y:230}],
  ['jungle', {id:'UrwaldShop',x:220,y:360}, {id:'Urwaldexperte',x:200,y:490}],
  ['desert', {id:'Fremdweg',x:720,y:460}, exits.desert.underground],
  ['underground', {id:'UnderShop',x:445,y:210}, exits.underground.desert],
  ['underground', {id:'Kristalltiefen',x:690,y:450}, exits.underground.jungle],
  ['jungle', {id:'UrwaldShop',x:220,y:360}, exits.jungle.underground],
];
for (const [world, from, to] of pairs) test(`${world}: ${from.id} ↔ ${to.id} follows the same curved trail in both directions`, () => {
  const forward = route(world, from, to), backward = route(world, to, from);
  assert.equal(forward.length, backward.length);
  assert.ok(forward.length > Math.hypot(to.x-from.x,to.y-from.y) * 1.015);
  assert.deepEqual(point(forward, 0), foot(from)); assert.deepEqual(point(forward, forward.length), foot(to));
  for (let i=0;i<=20;i++) {
    const a=point(forward,forward.length*i/20), b=point(backward,backward.length*(1-i/20));
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.00001);
  }
});
function actor(x=0,y=0) { return {x,y,active:true,visible:true,texture:'knight-hammer-standing',
  setTexture(key){this.texture=key;return this},getData(){return 'knight-hammer-standing'},
  setPosition(x,y){this.x=x;this.y=y;return this},setFlipX(value){this.flipX=value;return this},
  setDepth(){return this},setVisible(value){this.visible=value;return this},setDisplaySize(w,h){this.width=w;this.height=h;return this}}; }
function travelFixture(world, from, female=false) {
  const at=foot(from), events=new EventEmitter();
  // Phaser's emitter supports an explicit listener context.
  const listeners=[];
  const scene={travelSpeed:260,playerMarker:actor(at.x,at.y),companionMarker:actor(at.x-28,at.y),
    registry:{get:()=>({playerGender:female?'female':'male'})},add:{ellipse:()=>actor()},
    events:{on(e,f,c){const fn=f.bind(c);listeners.push({e,f,c,fn});events.on(e,fn)},once(e,f,c){events.once(e,f.bind(c))},
      off(e,f,c){const entry=listeners.find(l=>l.e===e&&l.f===f&&l.c===c);if(entry)events.off(e,entry.fn)}}};
  return {scene,events,travel:new ctx.WorldMapTravel(scene,world)};
}
test('short, long and boundary routes advance 260 pixels per second, independent of frame rate', () => {
  for (const [world,from,to] of pairs) for(const delta of [8,16.67,40,100]) {
    const {scene,travel}=travelFixture(world,from);let completed=0;travel.travel(from,to,()=>completed++);
    const length=travel.route.length;let elapsed=0;
    while(travel.active) {
      const before=travel.distance;travel.update(0,delta);elapsed+=delta;
      assert.ok(Math.abs(travel.distance-Math.min(length,before+delta*.26))<1e-8);
      if(travel.active) assert.ok(scene.playerMarker.texture.startsWith('knight-walk-'));
    }
    assert.equal(completed,1);assert.equal(scene.isMoving,false);assert.equal(scene.playerMarker.texture,'knight-hammer-standing');
    assert.ok(elapsed>=length/260*1000-.00001&&elapsed<length/260*1000+delta+.00001);
    assert.deepEqual({x:scene.playerMarker.x,y:scene.playerMarker.y},JSON.parse(JSON.stringify(foot(to))));
  }
});
test('walking uses all six gender-specific phases and faces the direction of travel', () => {
  const [world,from,to]=pairs[0];
  for(const female of [false,true]) {
    const {scene,travel}=travelFixture(world,from,female),seen=new Set();travel.travel(from,to);
    for(let i=0;i<40;i++){travel.update(0,16);seen.add(scene.playerMarker.texture)}
    assert.equal(seen.size,6);for(const key of seen)assert.ok(key.startsWith(female?'knight-female-walk-':'knight-walk-'));
    assert.equal(scene.playerMarker.flipX,false);
    while(travel.active)travel.update(0,16);travel.travel(to,from);travel.update(0,100);assert.equal(scene.playerMarker.flipX,true);
  }
});
test('the helper follows the actual trail, and shutdown cancels travel and its completion callback', () => {
  const [world,from,to]=pairs[2],{scene,events,travel}=travelFixture(world,from);let calls=0;
  travel.travel(from,to,()=>calls++);for(let i=0;i<30;i++)travel.update(0,16);
  const follow=point(travel.route,travel.distance-30);
  assert.ok(Math.abs(scene.companionMarker.x-follow.x)<1e-8);
  assert.ok(Math.abs(scene.companionMarker.y-follow.y)<=4);
  events.emit('shutdown');assert.equal(travel.active,false);assert.equal(calls,0);assert.equal(events.listenerCount('update'),0);
});
test('drinking has four repeating phases, and only works near a puddle on the same floor', () => {
  assert.equal(new Set([0,140,280,420].map(ctx.companionDrinkTexture)).size,4);
  assert.equal(ctx.companionDrinkTexture(560),ctx.companionDrinkTexture(0));
  assert.equal(ctx.canHelperDrink({x:100,y:500,visible:true},{x:125,y:500}),true);
  assert.equal(ctx.canHelperDrink({x:100,y:470,visible:true},{x:125,y:500}),false);
  assert.equal(ctx.canHelperDrink({x:100,y:500,visible:false},{x:125,y:500}),false);
});
test('the helper exits its drinking pose when the puddle is gone, even during attack cooldown', () => {
  const helper=actor(100,500),puddle={x:100,y:500};
  const scene=Object.create(ctx.JungleScene.prototype);
  Object.assign(scene,{worldTime:1000,equipped:{companion:'default'},helperRespawnAt:0,helperNextAt:5000,helper,
    player:{x:136,body:{bottom:500}},facingX:1,hud:{setCompanionStatus(){}},hazards:{puddles:[puddle]}});
  scene.updateHelper(.016);assert.equal(helper.texture,'companion-drinking-0');
  scene.worldTime=1140;scene.updateHelper(.016);assert.equal(helper.texture,'companion-drinking-1');
  scene.hazards.puddles=[];scene.updateHelper(.016);assert.equal(helper.texture,'companion-running');assert.equal(scene.helperDrinkingPuddle,null);
});
