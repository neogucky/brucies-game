const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({});
function load(file,name){let code=fs.readFileSync(path.join(root,file),'utf8').replace(/^import[\s\S]*?;\n/gm,'');if(name)code=code.replace(/export default class \w+/,'globalThis.'+name+' = class '+name);vm.runInContext(code.replace(/export /g,''),ctx);}
load('src/utils/weapons.js');load('src/utils/hammerRules.js');load('src/utils/SwordAnimation.js','SwordAnimation');load('src/utils/MeleeAnimation.js','MeleeAnimation');
const metadata=JSON.parse(fs.readFileSync(path.join(root,'assets/common/characters/sword-b/frames.json'),'utf8'));
function image(key='idle'){
 return {active:true,scene:{},visible:true,alpha:.45,depth:10,x:300,y:400,originY:1,scaleY:.6,displayHeight:90,texture:{key},
 getData:k=>k==='crouchTexture'?'crouch':'idle',setTexture(k){this.texture={key:k};return this},setOrigin(x,y){this.originX=x;this.originY=y;return this},
 setPosition(x,y){this.x=x;this.y=y;return this},setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this},setVisible(v){this.visible=v;return this},
 setAlpha(v){this.alpha=v;return this},setDepth(v){this.depth=v;return this},setFlipX(v){this.flipX=v;return this},setRotation(v){this.rotation=v;return this},destroy(){this.active=false}};
}
function fixture(gender='male',stance='stand',direction=1){
 const sequences=Object.fromEntries(Object.entries(metadata).map(([id,s])=>[id,{maxReach:s.maxReach,frames:s.frames.map((_,i)=>({key:id+'-'+i}))}]));
 const bodies=Array.from({length:13},(_,i)=>({key:'old-body-'+i,shoulder:{x:14,y:-62}}));
 const assets={bodies:{'male-stand':bodies,'male-crouch':bodies,'female-stand':bodies,'female-crouch':bodies},parts:Object.fromEntries(['upper','forearm','hand','sword','powerHammer'].map(key=>[key,{key,length:100,height:50,originX:.5,originY:.5,angle:0,outline:[{x:0,y:0},{x:1,y:0},{x:1,y:.1}]}]))};
 for(const g of ['male','female'])for(const st of ['stand','crouch','jump'])assets.bodies[g+'-left-far-'+st]=bodies.map((f,i)=>({...f,key:g+'-'+st+'-left-far-'+i,shoulder:{x:6,y:st==='crouch'?-44:-65}}));
 const scene={gameMode:'jump',worldTime:0,player:image(),facingX:direction,isDucking:stance==='crouch',isSwinging:true,swingStartedAt:0,equipped:{weapon:'sword'},weaponSwitch:{hand:'melee'},
 registry:{get:k=>k==='saveData'?{playerGender:gender}:k==='sword-animation-assets'?{sequences}:assets},add:{image:(_x,_y,key)=>image(key)}};
 scene.player.body={bottom:398.2,width:30,height:64.8,offset:{x:49,y:39},blocked:{down:stance!=='jump'},touching:{down:false},velocity:{x:0,y:stance==='jump'?-150:0}};
 scene.getMeleeBounds=()=>ctx.getJumpMeleeBounds(scene);
 return {scene,animation:new ctx.MeleeAnimation(scene)};
}
for(const gender of ['male','female'])for(const stance of ['stand','crouch','jump'])for(const direction of [-1,1])test(`${gender}, ${stance}, facing ${direction}: plays complete Variant B poses and preserves the physics actor`,()=>{
 const {scene:s,animation:a}=fixture(gender,stance,direction),body=s.player.body,seen=new Set();
 for(let t=0;t<140;t+=8){s.worldTime=t;a.update();seen.add(a.lastPose.frameIndex);
  assert.equal(a.lastPose.renderer,'sword-b');assert.equal(a.lastPose.stance,stance);assert.match(a.lastPose.frame,new RegExp('^'+gender+'-'+stance));
  assert.equal(s.player.body,body);assert.equal(s.player.scaleY,.6);assert.equal(body.height,64.8);
  if(direction>0){
   assert.ok(a.images.every(i=>!i.visible),'no extra arm behind the complete near-side pose');
   assert.equal(a.sword.body.alpha,.45);assert.equal(a.sword.body.flipX,false);
   assert.equal(Math.abs(a.sword.body.scaleX),a.sword.body.scaleY,'no thinning or vertical squash');
   const edge=300+a.lastPose.offsetX+metadata[gender+'-'+stance].maxReach*.6;
   assert.ok(Math.abs(edge-348)<1e-8,'longest visible cut ends at real horizontal reach');
  }else{
   assert.equal(a.lastPose.view,'far');assert.equal(a.sword.body.visible,false);
   assert.ok(a.body.depth>a.upper.depth&&a.body.depth>a.hand.depth&&a.body.depth>a.weapon.depth,'body occludes the right shoulder and sword arm');
   assert.equal(a.body.alpha,.45);assert.equal(a.body.flipX,false);
  }
 }
 if(direction>0)assert.equal(seen.size,metadata[gender+'-'+stance].frames.length-2,'each painted strike pose appears');
 else assert.ok(seen.size>5,'far-side body has multiple coil and weight-transfer positions');
});
test('low crouched strike stays in the lower tile for both weapons, independent of raised auto-aim',()=>{
 for(const weapon of ['sword','powerHammer'])for(const direction of [-1,1]){
  const {scene:s}=fixture('male','crouch',direction);s.tileSize=40;s.equipped.weapon=weapon;s.autoAimTarget={enemy:{active:true,y:300}};
  const hit=ctx.getJumpMeleeBounds(s);assert.equal(hit.y,358.2);assert.equal(hit.height,40);assert.equal(hit.y+hit.height,s.player.body.bottom);
  const standing=ctx.getJumpMeleeBounds({...s,isDucking:false});assert.equal(standing.height,80);assert.equal(standing.y,318.2);
 }
});
test('airborne stance takes priority over a stale crouch flag, then changes cleanly on landing',()=>{
 const {scene:s,animation:a}=fixture('female','jump');s.isDucking=true;a.update();assert.equal(a.lastPose.stance,'jump');
 assert.equal(ctx.getJumpMeleeBounds(s).height,76,'airborne cut cannot inherit the old crouch height');
 s.player.body.blocked.down=true;s.worldTime=70;a.update();assert.equal(a.lastPose.stance,'crouch');
 s.isDucking=false;s.worldTime=110;a.update();assert.equal(a.lastPose.stance,'stand');
});
test('sword recovery causes no extra attack, pauses with the game, and a new swing interrupts it',()=>{
 const {scene:s,animation:a}=fixture();s.worldTime=130;a.update();s.isSwinging=false;s.worldTime=140;a.update();
 assert.equal(a.lastPose.phase.stage,'recovery');assert.equal(s.isSwinging,false);const frame=a.lastPose.frame;
 s.isPaused=true;s.worldTime=5000;a.update();assert.equal(a.lastPose.frame,frame);assert.equal(a.state.recoveryElapsed,0);
 s.isPaused=false;s.isSwinging=true;s.swingStartedAt=5010;s.worldTime=5010;a.update();assert.equal(a.lastPose.frameIndex,0);
});
for(const reason of ['climbingVine','isGameOver','levelCompleted','isComplete'])test(reason+' hides the complete sword pose too',()=>{
 const {scene:s,animation:a}=fixture();a.update();assert.equal(a.sword.body.visible,true);s[reason]=true;a.update();assert.equal(a.sword.body.visible,false);assert.equal(a.state,null);
});
test('turning during recovery safely changes the camera side without a stale arm pose',()=>{
 for(const direction of [-1,1]){const{scene:s,animation:a}=fixture('male','stand',direction);s.worldTime=130;a.update();s.isSwinging=false;s.worldTime=140;a.update();s.facingX=-direction;s.worldTime=150;
 assert.doesNotThrow(()=>a.update());assert.equal(a.state,null);assert.ok(a.images.every(i=>!i.visible));assert.equal(a.sword.body.visible,false);}
});
test('switching to bow removes the entire sword drawing, and shutdown destroys it safely',()=>{
 const {scene:s,animation:a}=fixture();a.update();s.weaponSwitch.pending={kind:'bow'};s.player.setTexture('knight-bow-hitting');a.update();
 assert.equal(a.sword.body.visible,false);assert.equal(s.player.texture.key,'knight-bow-hitting');
 s.player.active=false;s.player.scene=undefined;assert.doesNotThrow(()=>a.destroy());assert.equal(a.sword.body.active,false);
});
test('the hammer retains its independent windup, charge and falling slam renderer',()=>{
 for(const kind of ['swing','charge','slam']){
  const {scene:s,animation:a}=fixture();s.equipped.weapon='powerHammer';
  if(kind==='charge')s.hammerCharge={holding:true,ready:true,sequence:1,elapsed:1200};
  if(kind==='slam')s.hammerSlamActive=true;
  a.update();assert.equal(a.sword.body.visible,false);assert.notEqual(a.lastPose.renderer,'sword-b');
  assert.equal(a.lastPose.phase.stage,kind==='charge'?'charge':kind==='slam'?'slam':'windup');
 }
});
for(const gender of ['male','female'])test(gender+': isometric sword also uses the anatomical right shoulder when facing right',()=>{
 const {scene:s,animation:a}=fixture(gender);s.gameMode='isometric';s.facing={x:1,y:0};
 const assets=s.registry.get('melee-animation-assets');
 assets.bodies[gender+'-right-stand']=assets.bodies[gender+'-stand'].map(f=>({...f,key:'right-handed-body',shoulder:{x:-16,y:-62}}));
 a.update();assert.equal(a.body.texture.key,'right-handed-body');assert.equal(a.body.flipX,false);
 assert.ok(a.lastPose.shoulder.x<0,'right shoulder is on image-left rather than behind the mirrored shield');
});
test('production atlas cuts retain original proportions and fit completely inside runtime textures',()=>{
 for(const [name,s]of Object.entries(metadata)){
  const p=path.join(root,'assets/common/characters/sword-b',s.source);assert.ok(fs.existsSync(p));
  assert.ok(s.frames.length>=7);const source=fs.readFileSync(p),w=source.readUInt32BE(16),h=source.readUInt32BE(20);
  for(const f of s.frames){const[x,y,width,height]=f.rect,[rx,ry]=f.root,k=s.pixelScale;
   assert.ok(x>=0&&y>=0&&x+width<=w&&y+height<=h,name+' source crop');
   assert.ok(160+(x-rx)*k>=0&&160+(x+width-rx)*k<=320,name+' no cut-off blade');
   assert.ok(187+(y-ry)*k>=0&&187+(y+height-ry)*k<=202,name+' full helmet, boots and low blade tip');
  }
 }
});
test('far-side standing, crouched and airborne body poses fit fully without shrinking the limbs',()=>{
 const rows=JSON.parse(fs.readFileSync(path.join(root,'assets/common/characters/sword-b/left-far-bodies.json'),'utf8'));
 assert.equal(rows.length,6);for(const row of rows){assert.equal(row.length,3);for(const[x,y,w,h,fx,fy]of row){
  assert.ok(100+(x-fx)*.44>=0&&100+(x+w-fx)*.44<=200);
  assert.ok(148+(y-fy)*.44>=0&&148+(y+h-fy)*.44<=150,'full helmet and boots stay in the animation');
 }}
});

class Rectangle{constructor(x,y,width,height){Object.assign(this,{x,y,width,height});}get right(){return this.x+this.width}get bottom(){return this.y+this.height}}
ctx.Phaser={Scene:class{},Geom:{Rectangle,Intersects:{RectangleToRectangle:(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y}}};
load('src/scenes/jungle/JungleScene.js','JungleScene');
for(const weapon of ['sword','powerHammer'])for(const duck of [false,true])test(`Urwald ${weapon}, crouched ${duck}: the actual attack damages only enemies in the matching rows`,()=>{
 const s=Object.create(ctx.JungleScene.prototype),upper={active:true,hp:3,bounds:new Rectangle(310,330,20,25)},lower={active:true,hp:3,bounds:new Rectangle(310,370,20,20)};
 const hitbox={setPosition(){return this},setSize(){return this},setVisible(){return this}};
 Object.assign(s,{equipped:{weapon},isSwinging:true,isDucking:duck,worldTime:150,swingUntil:300,swingReadyAt:0,swingHits:new Set(),
  player:{x:300,body:{bottom:400,blocked:{down:true}}},facingX:1,monkeys:[upper,lower],hazards:{projectiles:[]},swordHitbox:hitbox,
  enemyBounds:m=>m.bounds,damageMonkey(m,n){m.hp-=n;}});
 s.updateSwing();s.updateSwing();
 assert.equal(upper.hp,duck?3:2);assert.equal(lower.hp,2,'each target is damaged once per attack');
});
