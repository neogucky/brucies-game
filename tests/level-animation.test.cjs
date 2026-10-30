const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { EventEmitter } = require('node:events');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function moduleFor(file, extra = {}) {
  const code = read('src/utils/' + file + '.js').replace(/^import .*;\n/gm, '').replace(/export default class (\w+)/, 'globalThis.$1 = class $1').replace(/export /g, '');
  const ctx = vm.createContext(extra); vm.runInContext(code, ctx); return ctx;
}
const gait = moduleFor('KnightGait');
const paused = s => Boolean(s.isPaused || s.inventoryOpen || s.confirmation?.isOpen || s.physics?.world?.isPaused);
const motions = moduleFor('PlayerAnimation', { PLAYER_MOTION_EMPTY: 'empty', KnightGait: gait.KnightGait });
const sounds = moduleFor('MotionAudio');
const actions = moduleFor('CompanionActions', { animationPaused: paused, playMotionSound: sounds.playMotionSound });

test('sword keeps the anatomical right glove when an empty-handed body faces either direction',()=>{
  const metadata=JSON.parse(read('assets/common/characters/level-motion/frames.json'));
  for(const f of metadata.poses){
    const frame={hand:{x:f.root[0]-f.hand[0],y:f.hand[1]},otherHand:{x:f.root[0]-f.otherHand[0],y:f.otherHand[1]}};
    for(const direction of [-1,1])assert.ok(direction*motions.swordHand(frame,direction).x<0,'right hand remains on image-left, rather than swapping through mirroring');
  }
});

test('the idle sword is behind the torso when looking left and in front when looking right',()=>{
 for(const direction of [-1,1]){
  const {s,animation:a}=fixture();s.equipped.weapon='sword';s.facingX=direction;
  a.assets.poses.forEach(f=>f.otherHand={x:-20,y:-50});
  const get=s.registry.get;s.registry.get=k=>k==='melee-animation-assets'?{parts:{sword:{key:'blade',length:100,originX:.5,originY:.5,angle:0}}}:get(k);
  a.update(16);assert.equal(a.weapon.visible,true);
  assert.equal(a.weapon.depth<a.body.depth,direction<0,'the fixed camera determines occlusion, not the hand label');
 }
});

function image(x = 200, y = 400, key = 'standing') {
  return { x,y,active:true,visible:true,alpha:1,depth:5,originY:1,scaleY:.6,displayHeight:90,texture:{key},data:{},
    getData(k){return this.data[k]},setData(k,v){this.data[k]=v;return this},
    setPosition(x,y){this.x=x;this.y=y;return this},setTexture(key){this.texture={key};return this},
    setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this},setOrigin(x,y=x){this.originX=x;this.originY=y;return this},
    setDepth(v){this.depth=v;return this},setAlpha(v){this.alpha=v;return this},setVisible(v){this.visible=v;return this},
    setFlipX(v){this.flipX=v;return this},setRotation(v){this.rotation=v;return this},setDisplaySize(w,h){this.displayWidth=w;this.displayHeight=h;return this},destroy(){this.active=false},
  };
}
function body() { return {width:30,height:64.8,offset:{x:49,y:39},enable:true,allowGravity:true,blocked:{down:true},velocity:{x:0,y:0},
  setVelocity(x,y){this.velocity={x,y}},setAllowGravity(v){this.allowGravity=v},reset(){},bottom:400}; }
function fixture() {
  const player=image(); player.body=body(); player.scene={};player.data={standingTexture:'standing',crouchTexture:'crouch'};
  const assets={poses:Array.from({length:32},(_,i)=>({key:'pose-'+i,hand:{x:20,y:-50}})),locomotion:Array.from({length:32},(_,i)=>({key:'move-'+i,hand:{x:20,y:-50}}))};
  const played=[];
  const s={player,gameMode:'jump',sys:{settings:{key:'JungleScene'}},registry:{get:k=>k==='level-motion-assets'?assets:{}},
    add:{image:(x,y,key)=>image(x,y,key),text:(x,y)=>image(x,y)},events:new EventEmitter(),physics:{world:{}},time:{now:0},
    cache:{audio:{exists:()=>true}},sound:{play:(key)=>played.push(key)},equipped:{weapon:null,companion:'default'}};
  return {s,played,animation:new motions.PlayerAnimation(s)};
}

test('walk and run alternate the two feet, with a planted and a lifted half cycle',()=>{
  for(const run of [false,true])for(let t=0;t<Math.PI*2;t+=.1){
    const a=gait.gaitLeg(t,run),b=gait.gaitLeg(t+Math.PI,run);
    assert.ok(Math.abs(a.foot.x+b.foot.x)<1e-10);
    if(a.planted)assert.equal(a.foot.y,-10);
    assert.ok(Math.hypot(a.knee.x-a.hip.x,a.knee.y-a.hip.y)<=23.5+1e-9);
    assert.ok(Math.hypot(a.foot.x-a.knee.x,a.foot.y-a.knee.y)<=23.5+1e-9);
  }
  assert.ok(gait.gaitLeg(Math.PI*1.5,true).foot.y<gait.gaitLeg(Math.PI*1.5,false).foot.y,'run lifts the feet farther');
});
test('running changes the stride without lengthening the knight legs',()=>{
  for(const run of [false,true])for(let phase=0;phase<Math.PI*2;phase+=.03){
    const leg=gait.gaitLeg(phase,run);
    assert.ok(Math.abs(Math.hypot(leg.knee.x-leg.hip.x,leg.knee.y-leg.hip.y)-12.5)<1e-8);
    assert.ok(Math.abs(Math.hypot(leg.foot.x-leg.knee.x,leg.foot.y-leg.knee.y)-14.5)<1e-8);
  }
});
test('walking armor and boots preserve their painted aspect ratios rather than thinning the limbs',()=>{
  const parts=[
    {width:129,height:238,length:184,angle:1.53}, {width:168,height:244,length:188,angle:1.52},
    {width:150,height:255,length:192,angle:1.47}, {width:147,height:244,length:184,angle:1.47},
    {width:210,height:191,length:1,angle:0}, {width:209,height:191,length:1,angle:0},
  ].map((p,i)=>({...p,key:'part-'+i,originX:.5,originY:.1}));
  const scene={registry:{get:()=>({rig:{parts}})},add:{image:()=>image()}};
  for(const running of [false,true])for(const direction of [-1,1]){
    const rig=new gait.KnightGait(scene);
    for(let i=0;i<30;i++){
      rig.update({delta:16,running,direction,scale:.6,x:100,feetY:400,depth:5,alpha:1,visible:true});
      for(const limb of rig.images)assert.ok(Math.abs(Math.abs(limb.scaleX)-limb.scaleY)<1e-9,'both sprite axes have identical scale');
      for(let leg=0;leg<2;leg++)if(rig.poses[leg].planted){
        const boot=rig.images[leg*3+2],part=parts[leg?4:5];
        const sole=boot.y+(1-boot.originY)*part.height*boot.scaleY;
        assert.ok(Math.abs(sole-400)<.1,'chunkier boots remain on the ground');
      }
    }
  }
});
test('male and female use distinct crouch, air, landing and three special idle drawings',()=>{
  for(const state of ['idle','walk','run','crouch','rise','apex','fall','land','helmet','look','stretch']){
    const m=motions.motionFrame(state,200),f=motions.motionFrame(state,200,true);assert.equal(f.index-m.index,16);
  }
  assert.notEqual(motions.motionFrame('crouch',0).index,motions.motionFrame('crouch',100).index);
  assert.notEqual(motions.motionFrame('rise',0).index,motions.motionFrame('rise',100).index);
  assert.notEqual(motions.motionFrame('land',0).index,motions.motionFrame('land',100).index);
});
test('walking animates only actual movement and never changes the collider or host scale',()=>{
  const {s,animation:a}=fixture(),b=s.player.body,offset=b.offset;
  a.update();b.velocity.x=180;a.update(30);assert.equal(a.state,'idle','pushing into a wall does not skate');
  const frames=new Set();for(let i=0;i<20;i++){s.player.x+=3;a.update(30);frames.add(a.currentFrame.index)}
  assert.equal(a.state,'walk');assert.ok(frames.size>=6);
  assert.equal(b.width,30);assert.equal(b.height,64.8);assert.equal(b.offset,offset);assert.equal(s.player.scaleY,.6);
});
test('120/144 Hz rendering between 60 Hz physics steps does not alternate idle and walk',()=>{
  for(const hz of [60,120,144,240]){
    const {s,animation:a}=fixture(),b=s.player.body; a.update(); b.velocity.x=180;
    const states=new Set(),frames=new Set();let physicsTime=0;
    for(let i=0;i<hz;i++){
      physicsTime+=1000/hz;if(physicsTime>=1000/60){s.player.x+=3;physicsTime-=1000/60}
      a.update(1000/hz);if(i>8){states.add(a.state);frames.add(a.currentFrame.index)}
    }
    assert.deepEqual([...states],['walk']);assert.ok(frames.size>=6);
    for(let i=0;i<15;i++)a.update(1000/hz);assert.equal(a.state,'idle','walking into a wall settles');
  }
});
test('duck and stand transitions play once, landing compresses before idle',()=>{
  const {s,animation:a}=fixture();a.update();s.isDucking=true;a.update(16);assert.equal(a.state,'crouch');
  for(let i=0;i<20;i++)a.update(16);s.isDucking=false;a.update(16);assert.equal(a.state,'stand');
  for(let i=0;i<10;i++)a.update(16);assert.equal(a.state,'idle');
  s.player.body.blocked.down=false;s.player.body.velocity.y=220;a.update(16);assert.equal(a.state,'fall');
  s.player.body.blocked.down=true;s.player.body.velocity.y=0;a.update(16);assert.equal(a.state,'land');
  for(let i=0;i<15;i++)a.update(16);assert.equal(a.state,'idle');
});
test('pause freezes body and gait clocks, and climb/bow/melee own their poses',()=>{
  const {s,animation:a}=fixture();a.update();s.isPaused=true;const before=a.clock;a.update(500);assert.equal(a.clock,before);
  s.isPaused=false;for(const special of ['climbingVine','climbMantle','isSwinging','hammerSlamActive']){s[special]=true;s.player.setTexture('special-pose');a.update();assert.equal(a.body.visible,false);assert.equal(s.player.texture.key,'special-pose');s[special]=false;}
  s.weaponSwitch={hand:'bow',now:20,shotUntil:300};s.player.setTexture('bow-up');a.update();assert.equal(a.body.visible,false);assert.equal(s.player.texture.key,'bow-up');
});
test('all three rare idles appear and movement interrupts them immediately',()=>{
  const {s,animation:a}=fixture(),seen=new Set();
  for(let i=0;i<1300;i++){a.update(50);seen.add(a.state)}
  for(const special of ['helmet','look','stretch'])assert.ok(seen.has(special));
  s.player.body.velocity.x=180;s.player.x+=4;a.update(16);assert.equal(a.state,'walk');
});
test('quiet footsteps have a cadence, no sounds while paused, and one landing cue',()=>{
  const {s,played}=fixture(),a=new sounds.MotionAudio(s);
  const moving={state:'walk',dt:16,moving:true,grounded:true,velocity:{x:180,y:0},jump:true};
  for(let i=0;i<40;i++)a.update(moving);assert.equal(played.filter(k=>k==='sfx-footstep-leaf').length,2);
  const count=played.length;for(let i=0;i<50;i++)a.update({...moving,dt:0});assert.equal(played.length,count);
  a.update({...moving,state:'land',moving:false,landing:true});a.update({...moving,state:'land',moving:false,landing:false});
  assert.equal(played.filter(k=>k==='sfx-landing-soft').length,1);
});

function helperFixture() {
  const f=fixture(),s=f.s;s.helper=image(200,400);s.helper.displayHeight=42;s.helper.body=body();s.worldTime=0;s.updateHelper=()=>{};
  let hits=0;const enemy={x:270,y:400,active:true,hidden:false};s.monkeys=[enemy];s.enemyBounds=m=>({x:m.x-20,y:m.y-45,width:40,height:45});s.damageMonkey=()=>hits++;
  s.companionActions=new actions.CompanionActions(s);
  return {...f,actions:s.companionActions,hits:()=>hits,enemy};
}
test('helper never seeks attacks on its own; hurt triggers a visible wind-up and exactly one hit',()=>{
  const {s,actions:a,played,hits}=helperFixture();for(let i=0;i<300;i++)a.update(50);assert.equal(hits(),0);
  s.events.emit('player-hurt',{amount:1,health:4});a.update(16);assert.equal(a.phase,'concern');assert.equal(hits(),0);
  for(let i=0;i<12;i++)a.update(50);assert.equal(a.phase,'anger');assert.equal(hits(),0);
  for(let i=0;i<30;i++)a.update(50);assert.equal(hits(),1);assert.equal(a.sequence,null);
  assert.ok(played.includes('sfx-helper-brave'));assert.ok(played.includes('sfx-helper-bounce'));
  s.events.emit('player-hurt',{amount:1,health:3});for(let i=0;i<100;i++)a.update(50);assert.equal(hits(),1,'long cooldown prevents repeated attacks');
});
test('drinking, carrying berries and flight take priority; vanished targets never take damage',()=>{
  for(const busy of ['drink','fruit','fly']){
    const {s,actions:a,hits}=helperFixture();if(busy==='drink')s.helperDrinkingPuddle={};if(busy==='fruit')s.helper.setData('state','returning-fruit');if(busy==='fly')s.companionMode='fly';
    s.events.emit('player-hurt',{amount:1});for(let i=0;i<70;i++)a.update(50);assert.equal(hits(),0);assert.equal(a.sequence,undefined);
  }
  const {s,actions:a,hits,enemy}=helperFixture();s.events.emit('player-hurt',{amount:1});a.update();enemy.active=false;for(let i=0;i<50;i++)a.update(50);assert.equal(hits(),0);
});
test('helper attack pauses with overlays and restores gravity and methods on shutdown',()=>{
  const {s,actions:a}=helperFixture();s.events.emit('player-hurt',{amount:1});a.update(16);
  assert.equal(s.helper.body.allowGravity,false);s.isPaused=true;const elapsed=a.sequence.elapsed;a.update(2000);assert.equal(a.sequence.elapsed,elapsed);
  a.destroy();assert.equal(s.helper.body.allowGravity,true);assert.equal(s.events.listenerCount('player-hurt'),1,'only the separate player animator listener remains');
});
test('atlases have all poses, clean separate silhouettes and valid in-image cutouts',()=>{
  const data=JSON.parse(read('assets/common/characters/level-motion/frames.json'));
  for(const [key,count]of Object.entries({locomotion:32,poses:32,helper:24,rig:12})){
    assert.equal(data[key].length,count);for(const f of data[key]){assert.ok(f.rect.every(Number.isFinite));assert.ok(f.rect[2]>0&&f.rect[3]>0)}
  }
  const html=read('index.html');for(const file of ['PlayerAnimation','KnightGait','CompanionActions','CompanionAnimation','LevelEffects','MotionAudio','levelMotionAssets'])assert.ok(html.includes('./src/utils/'+file+'.js'));
});
