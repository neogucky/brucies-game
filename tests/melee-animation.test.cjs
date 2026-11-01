const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ctx = vm.createContext({});
function load(file, name) {
  let code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/^import .*;\n/gm, '');
  if (name) code = code.replace(/export default class \w+/, 'globalThis.' + name + ' = class ' + name);
  vm.runInContext(code.replace(/export /g, ''), ctx);
}
load('src/utils/weapons.js'); load('src/utils/hammerRules.js'); load('src/utils/SwordAnimation.js', 'SwordAnimation'); load('src/utils/MeleeAnimation.js', 'MeleeAnimation');
const stats = vm.runInContext('WEAPON_STATS', ctx);
const frames = Array.from({ length: 13 }, (_, i) => ({ key: 'pose-' + i, shoulder: { x: 14 + i * .4, y: -62 + i * .7 } }));
// Convex silhouettes measured from the transparent production weapon atlas.
const sword = [[625,962],[693,914],[699,912],[1061,860],[1070,860],[1097,871],[1201,918],[1225,952],[1225,967],[1201,1002],[1068,1060],[1063,1060],[693,1009],[666,995],[625,966]];
const hammer = [[37,894],[49,806],[81,774],[131,763],[165,763],[220,773],[557,881],[602,929],[602,946],[556,994],[221,1090],[83,1090],[37,973]];
function part(key, vertices, pivot, length) {
  return { key, length, originX: .8, originY: .5, angle: 0,
    outline: vertices.map(([x,y]) => ({ x: (pivot[0]-x)/length, y: (y-pivot[1])/length })) };
}
const parts = {
  sword: part('sword-part', sword, [1155,961], 530),
  powerHammer: part('hammer-part', hammer, [430,939], 393),
  upper: { key:'upper-part',length:355,height:305,angle:0,originX:.81,originY:.63 },
  forearm: { key:'forearm-part',length:388,height:220,angle:0,originX:.87,originY:.51 },
  hand: { key:'hand-part',length:150,height:277,angle:0,originX:.43,originY:.48,wristRatio:155/150 },
};
function poseAt(weapon, elapsed, direction=1, ducking=false, aim=0, extra={}) {
  const x=400,feetY=500,width=stats[weapon].width,height=stats[weapon].height;
  return ctx.getMeleePose({ x,feetY,elapsed,direction,ducking,weapon,stats:stats[weapon],
    hit:{x:direction>0?x:x-width,y:feetY-(ducking?25:61)+aim-height/2,width,height},
    assets:{bodies:frames.map(f=>({...f,shoulder:{x:f.shoulder.x,y:f.shoulder.y+(ducking?20:0)}})),parts},...extra });
}

for (const weapon of ['sword']) for (const direction of [-1,1]) for (const ducking of [false,true]) {
  test(`${weapon}, facing ${direction}, ducking ${ducking}: visible weapon edge matches damage reach throughout the active swing`,()=>{
    for(const aim of [-16,0,16]) for(let elapsed=stats[weapon].windupMs;elapsed<stats[weapon].swingMs;elapsed+=8) {
      const pose=poseAt(weapon,elapsed,direction,ducking,aim);
      const visibleEdge=pose.x+direction*(pose.hand.x+pose.bounds.right);
      assert.ok(Math.abs(visibleEdge-(400+direction*stats[weapon].width))<1e-8);
      assert.ok(Number.isFinite(pose.elbow.x)&&Number.isFinite(pose.elbow.y));
      assert.ok(pose.hand.y+pose.bounds.top>=-(ducking?25:61)+aim-stats[weapon].height/2-2,
        'weapon remains in the attack height band');
      assert.ok(pose.hand.y+pose.bounds.bottom<=-(ducking?25:61)+aim+stats[weapon].height/2+2);
    }
  });
}
for (const direction of [-1,1]) {
  test('normal hammer '+direction+': whole-arm overhead arc reaches both rows and lands on the ground',()=>{
    const poses=Array.from({length:81},(_,i)=>poseAt('powerHammer',i*4,direction,false,0,{
      hit:{x:direction>0?400:340,y:424,width:60,height:76}}));
    assert.ok(Math.min(...poses.map(p=>p.hand.y+p.bounds.top))<-65,'head clears the high target row');
    assert.ok(poses.some(p=>p.hand.y+p.bounds.top<-38&&p.hand.y+p.bounds.bottom>-38),'passes between both rows');
    for(const elapsed of [260,300,319]){
      const p=poses[Math.round(elapsed/4)];
      assert.ok(Math.abs(p.hand.y+p.bounds.bottom+2)<1e-7,'head actually meets floor');
      assert.ok(Math.abs(p.hand.x+p.bounds.right-60)<1e-7,'head follows the damage reach');
    }
    for(let i=1;i<poses.length;i++)assert.ok(Math.hypot(poses[i].hand.x-poses[i-1].hand.x,poses[i].hand.y-poses[i-1].hand.y)<8,'no disconnected key pose');
    assert.ok(poses.every(p=>p.armWidths.upper===11&&p.armWidths.forearm===10&&p.handLength>0),'fixed armor widths; visible pixels checked in arm-silhouette.test.cjs');
  });
  test('crouched hammer '+direction+': forward thrust stays inside the lower tile',()=>{
    const hit={x:direction>0?400:340,y:462,width:60,height:38};
    const poses=Array.from({length:80},(_,i)=>poseAt('powerHammer',i*4,direction,true,0,{hit}));
    for(const p of poses){
      assert.ok(p.hand.y+p.bounds.top>=-38&&p.hand.y+p.bounds.bottom<=0,'only lower tile');
      assert.ok(Math.abs(p.angle+.035)<1e-8,'thrust does not become an overhead wrist flip');
    }
    const tip=p=>p.hand.x+p.bounds.right;
    assert.ok(tip(poses[54])-tip(poses[0])>15,'visible extension comes from whole arm');
    assert.ok(Math.abs(tip(poseAt('powerHammer',215,direction,true,0,{hit}))-60)<1e-8);
  });
}
test('hammer keeps its windup and sword responds immediately; damage and durations stay unchanged',()=>{
  assert.equal(ctx.getMeleePhase(0,stats.sword).stage,'strike');
  assert.equal(ctx.getMeleePhase(109,stats.powerHammer).stage,'windup');
  assert.equal(ctx.getMeleePhase(110,stats.powerHammer).stage,'strike');
  assert.equal(stats.sword.swingMs,120);assert.equal(stats.powerHammer.swingMs,320);
  assert.equal(stats.powerHammer.stoneMultiplier,2);
  const before=poseAt('powerHammer',109.999),after=poseAt('powerHammer',110);
  assert.ok(Math.hypot(before.hand.x-after.hand.x,before.hand.y-after.hand.y)<.001,'windup joins the strike without teleporting');
});
test('charged hammer release continues from the held pose and follows through to the ground',()=>{
  for (const holdMs of [400,1050,1750]) for (const direction of [-1,1]) {
    const attack=ctx.hammerAttackForHold(holdMs),charged=ctx.getAttackStats('powerHammer',attack);
    const held=poseAt('powerHammer',holdMs,direction,false,0,{kind:'charge'});
    const release=poseAt('powerHammer',0,direction,false,0,{stats:charged});
    assert.ok(Math.hypot(held.hand.x-release.hand.x,held.hand.y-release.hand.y)<1e-8);
    assert.equal(held.angle,release.angle);
    for (const elapsed of [charged.impactMs,charged.swingMs-1]) {
      const planted=poseAt('powerHammer',elapsed,direction,false,0,{stats:charged});
      assert.ok(Math.abs(planted.hand.y+planted.bounds.bottom+2)<1e-8,'hammer head reaches the floor');
      assert.ok(Math.abs(planted.hand.x+planted.bounds.right-60)<1e-8,'forward reach stays honest');
      assert.ok(Math.abs(planted.angle)<1e-8,'shaft stays horizontal: the metal cap, not the engraved side, hits the floor');
    }
  }
});
test('charged crouched attacks keep the same low thrust and release continuously',()=>{
  const hit={x:400,y:462,width:60,height:38};
  for(const direction of [-1,1])for(const hold of [400,1050,1750]){
    const attack=ctx.hammerAttackForHold(hold),stats=ctx.getAttackStats('powerHammer',attack);
    const held=poseAt('powerHammer',hold,direction,true,0,{kind:'charge',hit});
    const released=poseAt('powerHammer',0,direction,true,0,{stats,hit});
    assert.ok(Math.hypot(held.hand.x-released.hand.x,held.hand.y-released.hand.y)<1e-8);
    for(let elapsed=0;elapsed<stats.swingMs;elapsed+=8){
      const p=poseAt('powerHammer',elapsed,direction,true,0,{stats,hit});
      assert.ok(p.hand.y+p.bounds.top>=-38&&p.hand.y+p.bounds.bottom<=0);
      assert.ok(Math.abs(p.angle+.035)<1e-8);
      assert.deepEqual(JSON.parse(JSON.stringify(p.armWidths)),{upper:11,forearm:10,hand:9.5});
    }
  }
});
test('arm and weapon have additional positions between body key poses',()=>{
  const poses=Array.from({length:18},(_,i)=>poseAt('sword',i*8));
  assert.ok(new Set(poses.map(p=>p.angle.toFixed(4))).size>12);
  for(let i=1;i<poses.length;i++) assert.ok(Math.hypot(poses[i].hand.x-poses[i-1].hand.x,poses[i].hand.y-poses[i-1].hand.y)<8);
});

function image(key='idle') {
  return {active:true,scene:{},visible:true,alpha:1,depth:20,x:400,y:500,scaleY:.6,texture:{key},
    getData:k=>k==='crouchTexture'?'crouch':'idle',
    setTexture(key){this.texture={key};return this},setOrigin(x,y){this.originX=x;this.originY=y;return this},
    setVisible(v){this.visible=v;return this},setAlpha(v){this.alpha=v;return this},setDepth(v){this.depth=v;return this},
    setPosition(x,y){this.x=x;this.y=y;return this},setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this},
    setFlipX(v){this.flipX=v;return this},setRotation(v){this.rotation=v;return this},destroy(){this.active=false},
  };
}
function fixture() {
  const assets={bodies:{'male-stand':frames,'male-crouch':frames,'female-stand':frames,'female-crouch':frames},parts};
  const scene={registry:{get:k=>k==='saveData'?{}:assets},add:{image:(_x,_y,key)=>image(key)},worldTime:0,
    player:image(),equipped:{weapon:'sword'},facingX:1,isSwinging:true,swingStartedAt:0,swingVisualKind:'swing',
    getMeleeBounds:()=>({x:400,y:439-19,width:48,height:38}),weaponSwitch:{hand:'melee'}};
  return {scene,animation:new ctx.MeleeAnimation(scene)};
}
test('hammer uses the anatomical right arm on both sides for male/female and all three stances',()=>{
  for(const gender of ['male','female'])for(const direction of [-1,1])for(const stance of ['stand','crouch','jump']){
    const {scene,animation:a}=fixture(),assets=a.assets;
    scene.registry.get=k=>k==='saveData'?{playerGender:gender}:assets;
    const id=gender+(direction>0?'-hammer-right-':'-left-far-')+stance;
    assets.bodies[id]=frames.map(f=>({...f,key:id+'-'+f.key}));
    scene.gameMode='jump';scene.equipped.weapon='powerHammer';scene.facingX=direction;scene.isDucking=stance==='crouch';
    scene.player.body={blocked:{down:stance!=='jump'},touching:{down:false},velocity:{x:0,y:stance==='jump'?-100:0}};
    for(const t of [0,80,150,215,260,319]){
      scene.worldTime=t;a.update();
      const p=a.lastPose;
      assert.ok(p.frame.startsWith(id));assert.equal(a.body.flipX,false);
      assert.equal(p.view,direction>0?'near':'far');assert.equal(p.renderer,'hammer');
      assert.ok(Math.abs(a.upper.scaleY*parts.upper.height-11)<1e-8);
      assert.ok(Math.abs(a.forearm.scaleY*parts.forearm.height-10)<1e-8);
      assert.ok(Math.abs(a.hand.scaleY*parts.hand.height-9.5)<1e-8);
      assert.equal(a.body.depth>a.weapon.depth,direction<0);
    }
  }
});
test('normal floor impact is small, once per swing, and absent for crouched, airborne or charged swings',()=>{
  for(const variant of ['normal','crouch','air','charged']){
    const {scene,animation:a}=fixture(),sounds=[];
    scene.equipped.weapon='powerHammer';scene.gameMode='jump';
    scene.isDucking=variant==='crouch';
    scene.player.body={blocked:{down:variant!=='air'},touching:{down:false},velocity:{y:variant==='air'?-100:0}};
    scene.hammerAttack=variant==='charged'?ctx.hammerAttackForHold(1050):null;
    scene.cache={audio:{exists:()=>true}};scene.sound={play:(key,config)=>sounds.push({key,...config})};
    for(const t of [0,110,259,260,280,310]){scene.worldTime=t;a.update();}
    assert.equal(sounds.length,variant==='normal'?1:0);
    if(sounds.length){assert.equal(sounds[0].key,'sfx-stone-hit');assert.ok(sounds[0].volume<.3);}
  }
});
test('animation leaves the physics actor size and body untouched, and preserves damage blinking',()=>{
  const {scene,animation}=fixture(),body={width:30,height:65};scene.player.body=body;scene.player.alpha=.45;
  animation.update();
  assert.equal(scene.player.body,body);assert.equal(scene.player.scaleY,.6);
  assert.equal(scene.player.texture.key,'melee-player-body');
  assert.ok(animation.images.every(i=>i.visible&&i.alpha===.45));
  assert.equal(animation.body.scaleY,.6);
  for(const direction of [-1,1]) {
    scene.facingX=direction;animation.update();
    const p=animation.lastPose,draw=animation.weapon;
    for(const v of parts.sword.outline) {
      const sourceX=-v.x*parts.sword.length,sourceY=v.y*parts.sword.length;
      const transformed=draw.x+sourceX*draw.scaleX*Math.cos(draw.rotation)-sourceY*draw.scaleY*Math.sin(draw.rotation);
      assert.ok(direction*(transformed-scene.player.x)<=48+1e-8);
    }
  }
});
test('recovery is visual only and a new swing interrupts it immediately',()=>{
  const {scene,animation}=fixture();scene.worldTime=130;animation.update();
  scene.worldTime=140;scene.isSwinging=false;animation.update();
  assert.equal(animation.lastPose.phase.stage,'recovery');
  assert.equal(scene.isSwinging,false);
  scene.worldTime=170;scene.isSwinging=true;scene.swingStartedAt=170;animation.update();
  assert.equal(animation.lastPose.phase.stage,'strike');
  scene.isSwinging=false;scene.worldTime=310;animation.update();scene.worldTime=400;animation.update();
  assert.ok(animation.images.every(i=>!i.visible));assert.equal(scene.player.texture.key,'idle');
});
for(const blocked of ['climbingVine','isGameOver','levelCompleted','isComplete'])test(blocked+' cancels all melee drawing immediately',()=>{
  const {scene,animation}=fixture();animation.update();
  scene[blocked]=true;scene.player.setTexture(blocked==='climbingVine'?'knight-climb-0':'idle');animation.update();
  assert.ok(animation.images.every(i=>!i.visible));assert.equal(animation.state,null);
  if(blocked==='climbingVine')assert.equal(scene.player.texture.key,'knight-climb-0');
});
test('switching to bow cannot leave an extra melee weapon or overwrite the bow pose',()=>{
  const {scene,animation}=fixture();animation.update();
  scene.weaponSwitch.pending={kind:'bow'};scene.player.setTexture('knight-bow-hitting');animation.update();
  assert.ok(animation.images.every(i=>!i.visible));assert.equal(scene.player.texture.key,'knight-bow-hitting');
});
test('hammer falling and landing poses put the metal cap down and do not invent an extra damage swing',()=>{
  const falling=poseAt('powerHammer',150,1,false,0,{kind:'slam'});
  assert.equal(falling.phase.stage,'slam');assert.equal(falling.angle,0);assert.ok(Math.abs(falling.hand.y+falling.bounds.bottom+2)<1e-8);
  const landing=poseAt('powerHammer',0,1,false,0,{kind:'landing'});
  assert.equal(landing.phase.stage,'landing');assert.equal(landing.angle,0);assert.ok(Math.abs(landing.hand.y+landing.bounds.bottom+2)<1e-8);
  const {scene,animation}=fixture();animation.update();animation.destroy();
  assert.ok(animation.images.every(i=>!i.active));assert.equal(scene.player.texture.key,'idle');
});
test('scene shutdown is safe after Phaser has already destroyed the physics image',()=>{
  const {scene,animation}=fixture();animation.update();
  scene.player.active=false;scene.player.scene=undefined;
  scene.player.setTexture=()=>{throw Error('destroyed image must not be restored')};
  assert.doesNotThrow(()=>animation.destroy());
});
test('opening an overlay freezes both the swing and its visual recovery',()=>{
  const {scene,animation}=fixture();scene.worldTime=40;animation.update();
  scene.isPaused=true;scene.worldTime=5040;animation.update();assert.equal(animation.state.elapsed,40);
  scene.isPaused=false;scene.worldTime=5050;animation.update();assert.equal(animation.state.elapsed,50);
  scene.isSwinging=false;animation.update();scene.isPaused=true;scene.worldTime=9050;animation.update();
  assert.equal(animation.state.recoveryElapsed,0);
  scene.isPaused=false;scene.worldTime=9140;animation.update();assert.equal(animation.state,null);
});
test('underground drawing follows the pausable attack timer instead of wall-clock time',()=>{
  const {scene,animation}=fixture();delete scene.worldTime;scene.time={now:9040};scene.swingStartedAt=0;scene.swingTimer={elapsed:40};
  animation.update();assert.equal(animation.state.elapsed,40);
  scene.time.now=19040;scene.swingTimer.elapsed=50;animation.update();assert.equal(animation.state.elapsed,50);
});
test('sword extensions keep their own outward elbow path',()=>{
  for(const weapon of ['sword'])for(const direction of [-1,1])for(const duck of [false,true])
    for(const aim of [-16,0,16])for(let elapsed=0;elapsed<stats[weapon].swingMs;elapsed+=4){
      const p=poseAt(weapon,elapsed,direction,duck,aim);
      if(!p.sleevesVisible)continue;
      const upper={x:p.elbow.x-p.shoulder.x,y:p.elbow.y-p.shoulder.y};
      const fore={x:p.wrist.x-p.elbow.x,y:p.wrist.y-p.elbow.y};
      assert.ok(upper.x*fore.x+upper.y*fore.y>=0,'both sleeves point outward, without an acute inward fold');
      assert.ok(p.elbow.x>=Math.min(p.shoulder.x,p.wrist.x)-1e-8&&p.elbow.x<=Math.max(p.shoulder.x,p.wrist.x)+1e-8);
    }
});
test('the sword has a longer blade while its point still ends at the same damage boundary',()=>{
  const p=poseAt('sword',70);
  assert.equal(p.length,38);
  const bladeLength=(1061-625)/530*p.length;
  assert.ok(bladeLength>30,'blade is at least half again as long as the previous 20px blade');
  assert.equal(stats.sword.width,50.4);
});
test('foreshortening changes sleeve length without flattening the glove or armor thickness',()=>{
  const {scene,animation}=fixture();
  const sizes=[];
  for(const t of [0,35,70,105,139]){
    scene.worldTime=t;animation.update();sizes.push(animation.hand.scaleY);
    assert.ok(Math.abs(animation.upper.scaleY*parts.upper.height-11)<1e-8);
    assert.ok(Math.abs(animation.forearm.scaleY*parts.forearm.height-10)<1e-8);
  }
  assert.ok(sizes.every(size=>size===sizes[0]),'glove keeps its size throughout the swing');
});
test('attacks move the shoulder and upper arm as well as rotating the weapon',()=>{
  for(const weapon of ['sword','powerHammer']){
    const poses=Array.from({length:20},(_,i)=>poseAt(weapon,(stats[weapon].swingMs-1)*i/19));
    assert.ok(Math.max(...poses.map(p=>p.shoulder.x))-Math.min(...poses.map(p=>p.shoulder.x))>4);
    const upperAngles=poses.map(p=>Math.atan2(p.elbow.y-p.shoulder.y,p.elbow.x-p.shoulder.x));
    assert.ok(Math.max(...upperAngles)-Math.min(...upperAngles)>.4,'the whole upper arm participates');
  }
});
test('isometric attacks can point up and down while keeping the tip on the damage boundary',()=>{
  for(const yDirection of [-1,1])for(const weapon of ['sword','powerHammer']){
    const hit={x:380,y:yDirection<0?400:460,width:40,height:38};
    for(let elapsed=stats[weapon].windupMs;elapsed<stats[weapon].swingMs;elapsed+=12){
      const p=poseAt(weapon,elapsed,1,false,0,{hit,aimVector:{x:0,y:yDirection}});
      const edge=500+p.hand.y+(yDirection<0?p.bounds.top:p.bounds.bottom);
      assert.ok(Math.abs(edge-(yDirection<0?hit.y:hit.y+hit.height))<1e-7);
      assert.ok(Number.isFinite(p.elbow.x)&&Number.isFinite(p.elbow.y));
    }
  }
});

// Independent profile reference: raising the hand forward/up leaves the
// elbow forward/down. The previous implementation chose the mirrored elbow
// (behind/up), which was mathematically connected but anatomically reversed.
function flexion(shoulder,elbow,wrist){
 const u={x:elbow.x-shoulder.x,y:elbow.y-shoulder.y};
 const f={x:wrist.x-elbow.x,y:wrist.y-elbow.y};
 return Math.atan2(u.x*f.y-u.y*f.x,u.x*f.x+u.y*f.y);
}
function naturalProfile(shoulder,elbow,wrist){
 const bend=flexion(shoulder,elbow,wrist);
 return bend<=1e-6&&bend>=-Math.PI*5/6-1e-6;
}
test('hammer elbow matches raised-hand and forward-hand reference poses and rejects the reverse joint',()=>{
 const s={x:0,y:0},raised={x:20,y:-20},e=ctx.solveHammerElbow(s,raised);
 assert.ok(e.x>10&&e.y>-10,'raised forearm: elbow is forward and below the shoulder-hand chord');
 const low=ctx.solveHammerElbow(s,{x:20,y:20});
 assert.ok(low.x<10&&low.y>10,'low forward hand: upper arm lowers, forearm bends forward');
 assert.ok(naturalProfile(s,e,raised));
 assert.equal(naturalProfile(s,{x:0,y:-20},raised),false,'canary: old backwards IK branch must fail');
 assert.equal(naturalProfile(s,{x:20,y:-5},{x:30,y:0}),false,'canary: reject an overextended elbow too');
});
test('hammer elbow keeps one natural flexion direction and a limited bend across the complete motion',()=>{
 for(const direction of [-1,1])for(const ducking of [false,true]){
  for(const hold of [0,400,1050,1750]){
   const attack=hold?ctx.hammerAttackForHold(hold):null;
   const attackStats=hold?ctx.getAttackStats('powerHammer',attack):stats.powerHammer;
   for(let elapsed=0;elapsed<attackStats.swingMs;elapsed+=4){
    const p=poseAt('powerHammer',elapsed,direction,ducking,0,{stats:attackStats});
    assert.ok(naturalProfile(p.shoulder,p.elbow,p.wrist),'never reverse the anatomical hinge or overfold it');
    const upper=Math.hypot(p.elbow.x-p.shoulder.x,p.elbow.y-p.shoulder.y);
    const fore=Math.hypot(p.wrist.x-p.elbow.x,p.wrist.y-p.elbow.y);
    assert.ok(Math.abs(upper/fore-20/16)<1e-6,'projected bones retain their proportions');
    const world=point=>({x:p.x+direction*point.x,y:p.feetY+point.y});
    assert.ok(direction*flexion(world(p.shoulder),world(p.elbow),world(p.wrist))<=1e-6,'world-space reflection preserves the same right elbow');
   }
  }
 }
});
test('tucking the wrist foreshortens the arm instead of folding the elbow past its limit',()=>{
 for(const wrist of [{x:2,y:1},{x:-3,y:-2},{x:8,y:3}]){
  const s={x:0,y:0},e=ctx.solveHammerElbow(s,wrist);
  assert.ok(naturalProfile(s,e,wrist));
  assert.ok(Math.abs(flexion(s,e,wrist)+Math.PI*5/6)<1e-6);
 }
});

test('hammer windup and recovery meet the painted resting grip instead of jumping on restore',()=>{
 for(const direction of [-1,1]){
  const readyPose={hand:{x:direction>0?-12.7:13.1,y:-25},angle:direction>0?-2:-1.15};
  const assets={bodies:frames,parts,readyPose},start=poseAt('powerHammer',0,direction,false,0,{assets});
  assert.deepEqual(JSON.parse(JSON.stringify(start.hand)),readyPose.hand);assert.equal(start.angle,readyPose.angle);
  const impact=poseAt('powerHammer',319,direction,false,0,{assets});
  const recovered=poseAt('powerHammer',319,direction,false,0,{assets,recovery:1,recoveryPose:impact});
  assert.ok(Math.hypot(recovered.hand.x-readyPose.hand.x,recovered.hand.y-readyPose.hand.y)<1e-8);assert.ok(Math.abs(recovered.angle-readyPose.angle)<1e-8);
 }
});
