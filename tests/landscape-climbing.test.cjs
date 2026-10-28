const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx=vm.createContext({Phaser:{Scene:class{}}});
function load(file,name){let code=fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/^import[\s\S]*?;\n/gm,'');if(name)code=code.replace(/export default class \w+/,`globalThis.${name}=class ${name}`);vm.runInContext(code.replace(/export /g,''),ctx);}
load('src/utils/inventory.js');load('src/saveManager.js');load('src/utils/worldMapRoutes.js');load('src/utils/jungleRules.js');
load('src/scenes/UndergroundMapScene.js','UndergroundMapScene');load('src/scenes/jungle/JungleMapScene.js','JungleMapScene');
load('src/scenes/water/WaterMapScene.js','WaterMapScene');load('src/scenes/jungle/JungleScene.js','JungleScene');
const levels=vm.runInContext('JUNGLE_LEVELS',ctx),nodes=vm.runInContext('NODES',ctx),shore=vm.runInContext('WATER_SHORE',ctx);
const plain=value=>JSON.parse(JSON.stringify(value));
test('the closed gate approach ends on the shop side, and the opened passage actually crosses the threshold',()=>{
 const shop=nodes.find(n=>n.id==='UnderShop'),gate=nodes.find(n=>n.id==='Schluesseltor'),mine=nodes.find(n=>n.id==='Schluesselweg');
 const approach=ctx.getWorldMapRoute('underground',shop,gate),crossing=ctx.getWorldMapRoute('underground',gate,mine);
 assert.ok(approach.points.every(p=>p.x>=465));assert.equal(approach.points.at(-1).x,470);
 assert.ok(crossing.points.some(p=>Math.hypot(p.x-385,p.y-268)<2));
});
function vector(){return{x:0,y:0,copy(p){this.x=p.x;this.y=p.y;}};}
function climber(gender='male',y=1850){
 const s=Object.create(ctx.JungleScene.prototype),p={x:350,y,texture:'knight-hammer-standing',setTexture(k){this.texture=k;return this;},setPosition(x,y){this.x=x;this.y=y;return this;},getData(){return gender==='female'?'knight-female-hammer-standing':'knight-hammer-standing';}};
 const b={position:vector(),prev:vector(),prevFrame:vector(),autoFrame:vector(),height:64.8,velocity:{x:0,y:0},
  blocked:{down:false},touching:{down:false},
  get x(){return this.position.x;},get right(){return this.position.x+31.2;},
  get y(){return this.position.y;},get bottom(){return this.position.y+this.height;},updateCenter(){},
  setAllowGravity(v){this.allowGravity=v;return this;},setVelocity(x,y){this.velocity={x,y};return this;},setVelocityY(y){this.velocity.y=y;return this;},
  // Match Phaser 3.80: reset starts at the image corner, then the custom body
  // offset must be synchronized before reading a landing position.
  reset(x,y){p.setPosition(x,y);this.position.x=x-45;this.position.y=y-90;},
  updateFromGameObject(){this.position.x=p.x-15.6;this.position.y=p.y-66.6;}};
 b.updateFromGameObject();p.body=b;
 Object.assign(s,{worldTime:1000,climbCooldown:0,climbingVine:null,climbMantle:null,config:levels.Lianenpfad,branches:levels.Lianenpfad.branches,player:p,
  facingX:1,registry:{get:()=>({playerGender:gender})},textures:{exists:()=>true},hazards:{isSticky:()=>false},
  isSwinging:true,hammerSlamActive:true,weaponSwitch:{pending:{kind:'bow'},hand:'bow'},swordHitbox:{setVisible(v){this.visible=v;}}});
 return s;
}
for(const gender of ['male','female'])test(`${gender}: a fresh Up/W press grabs a vine immediately with empty hands`,()=>{
 const s=climber(gender);assert.equal(s.updateClimbing(0,true,false,true,.016),true);
 assert.ok(s.climbingVine);assert.match(s.player.texture,/climb-/);assert.equal(s.player.body.allowGravity,false);
 assert.equal(s.weaponSwitch.pending,null);assert.equal(s.isSwinging,false);assert.equal(s.hammerSlamActive,false);
});
for(const vine of levels.Lianenpfad.vines)test(`double-down at vine ${vine.x}/${vine.top}: fall freely, then grab upward before leaving reach`,()=>{
 const platform=levels.Lianenpfad.branches.find(p=>Math.abs(p.y-vine.bottom)<35&&vine.x>=p.x&&vine.x<=p.x+p.width);
 const s=climber('male',platform.y+1.8),b=s.player.body;
 s.player.x=vine.x;b.updateFromGameObject();b.blocked.down=true;s.lastDownAt=-1000;
 assert.equal(s.tryDropThrough(),false);
 assert.equal(s.updateClimbing(0,false,true,false,.016),false,'first Down must crouch on the platform');
 s.worldTime+=140;assert.equal(s.tryDropThrough(),true);
 assert.equal(s.updateClimbing(0,false,true,false,.016),false,'second Down must fall rather than grab downward');
 assert.equal(s.climbingVine,null);assert.equal(b.velocity.y,110);
 for(let i=0;i<10;i++){
  const dy=b.velocity.y*.016+.5*1050*.016**2;
  b.position.y+=dy;s.player.y+=dy;b.velocity.y+=1050*.016;s.worldTime+=16;
  assert.equal(s.updateClimbing(0,false,true,false,.016),false);
 }
 assert.equal(s.updateClimbing(0,true,false,false,.016),true);
 assert.equal(s.climbingVine,vine);assert.equal(b.allowGravity,false);assert.equal(b.velocity.y,-145);
 assert.match(s.player.texture,/climb-/);
});
for(const gender of ['male','female'])test(`${gender}: reaching upward during a fall overrides the regrab delay while the vine is still in reach`,()=>{
 const s=climber(gender,2010),b=s.player.body;
 s.climbCooldown=s.worldTime+300;b.velocity.y=220;
 assert.equal(s.updateClimbing(0,true,false,false,.016),true);
 assert.equal(s.climbingVine,levels.Lianenpfad.vines[0]);assert.equal(b.velocity.y,-145);
 assert.equal(b.allowGravity,false);assert.match(s.player.texture,/climb-/);
 assert.equal(s.weaponSwitch.pending,null);assert.equal(s.hammerSlamActive,false);
});
test('upward regrabbing cannot reach a vine after falling below it or moving too far sideways',()=>{
 for(const [x,y] of [[366,2010],[350,2050]]){
  const s=climber('male',y);s.player.x=x;s.player.body.updateFromGameObject();
  s.player.body.velocity.y=220;s.climbCooldown=s.worldTime+300;
  assert.equal(s.updateClimbing(0,true,false,false,.016),false);assert.equal(s.climbingVine,null);
 }
});
for(const direction of [-1,1])test(`sideways ${direction}: fifteen pixels remain attached; crossing the edge releases gravity`,()=>{
 const s=climber();s.updateClimbing(0,true,false,false,.016);
 s.player.x=350+15*direction;s.updateClimbing(direction,false,false,false,.016);
 assert.ok(s.climbingVine);assert.equal(s.player.body.velocity.x,direction*90);assert.equal(s.player.body.allowGravity,false);
 s.player.x+=.1*direction;assert.equal(s.updateClimbing(direction,false,false,false,.016),false);
 assert.equal(s.climbingVine,null);assert.equal(s.player.body.allowGravity,true);assert.match(s.player.texture,/hammer-standing/);
});
for(const gender of ['male','female'])test(`${gender}: the four pull-up poses preserve body offsets and finish safely above the branch`,()=>{
 const s=climber(gender,1561.8);s.updateClimbing(0,true,false,true,.016);assert.ok(s.climbMantle);
 const seen=new Set([s.player.texture]);let frames=0;
 while(s.climbMantle&&frames++<30){
  assert.equal(s.startSwing(),false);assert.equal(s.activateHammerSlam(),false);
  s.worldTime+=50;s.updateClimbing(0,true,false,false,.05);seen.add(s.player.texture);
  assert.ok(Math.abs(s.player.y-s.player.body.bottom-1.8)<1e-8);
  assert.equal(s.player.body.prev.y,s.player.body.position.y);
 }
 assert.equal(s.climbMantle,null);assert.equal(s.climbingVine,null);assert.equal(s.player.body.allowGravity,true);
 assert.equal([...seen].filter(k=>k.includes('mantle-')).length,4);
 assert.ok(s.player.body.bottom<1500&&s.player.body.bottom>1497);
 assert.equal(ctx.canLandOnBranch({...s.player.body,prev:{y:s.player.body.position.y},velocity:{y:0}},1500),true);
});

test('the closed key gate is on every route from the shop to the mine and crystal depths',()=>{
 const reached=new Set(['UnderShop']),todo=['UnderShop'];
 while(todo.length){const current=todo.shift(),n=nodes.find(n=>n.id===current);for(const id of Object.values(n.neighbors)){if(id!=='Schluesseltor'&&!reached.has(id)){reached.add(id);todo.push(id);}}}
 assert.equal(reached.has('Schluesselweg'),false);assert.equal(reached.has('Kristalltiefen'),false);
 const s=Object.create(ctx.UndergroundMapScene.prototype);let save={undergroundKeyCollected:false,unlockedLevels:['UnderShop','UnderDig','Schluesseltor']},moves=0,message;
 Object.assign(s,{currentNode:nodes.find(n=>n.id==='Schluesseltor'),unlocked:new Set(save.unlockedLevels),
  registry:{get:()=>save,set(_k,v){save=v;}},mapTravel:{travel(){moves++;}},showDialog(t){message=t;},sound:{play(){}}});
 ctx.saveProgress=()=>{};s.tryMove({x:-1,y:1});assert.equal(moves,0);s.startCurrentLevel();assert.match(message,/Verschlossen/);
 save.undergroundKeyCollected=true;s.startCurrentLevel();assert.ok(s.unlocked.has('Schluesselweg'));
 s.tryMove({x:-1,y:1});assert.equal(moves,1);assert.equal(nodes.find(n=>n.id==='Schluesselweg').label,'Steinwächtermine');
});
test('the water preview preserves world progression without inventing completed levels',()=>{
 const save=ctx.normalizeWorldProgress({currentLevel:'Lianenpfad',unlockedWorlds:['jungle'],completedLevels:['Urwaldkronen'],coins:321});
 const s=Object.create(ctx.JungleMapScene.prototype);let current=save,trip;
 Object.assign(s,{currentNode:{id:'Lianenpfad'},registry:{get:key=>key==='unlockAllForTesting'?true:current,set(_k,v){current=v;}},
  mapTravel:{travel(from,to,done){trip={from,to,done};}},scene:{start(key){s.started=key;}}});
 ctx.saveProgress=()=>{};s.travelToWater();
 assert.equal(current.currentWorld,'water');assert.equal(current.currentLevel,'Seeufer');assert.equal(current.coins,321);
 assert.deepEqual(plain(current.completedLevels),['Urwaldkronen']);assert.equal(current.mapState.jungleNode,'Lianenpfad');
 assert.equal(trip.to.id,'@water');trip.done();assert.equal(s.started,'WaterMapScene');
 assert.equal(ctx.normalizeWorldProgress(current).currentWorld,'water');
});
test('the lake shore has walking positions and a requirement, and returns to the jungle without starting a level',()=>{
 const s=Object.create(ctx.WaterMapScene.prototype);let save=ctx.normalizeWorldProgress({currentLevel:'Seeufer',coins:321,health:3,mapState:{jungleNode:'Lianenpfad'}}),hint;
 const gear=ctx.normalizeInventory(save),trips=[],starts=[];
 Object.assign(s,{...gear,health:3,currentNode:shore[0],unlocked:new Set(shore.map(n=>n.id)),
  registry:{get:()=>save,set(_k,v){save=v;}},showHint(t){hint=t;},scene:{start(key,data){starts.push({key,data});}},
  mapTravel:{travel(from,to,done){s.isMoving=true;trips.push({from,to,done(){s.isMoving=false;done?.();}});}}});
 ctx.saveProgress=()=>{};s.startCurrentLevel();assert.equal(trips[0].to.id,'Wasserkante');trips.shift().done();
 s.startCurrentLevel();assert.match(hint,/Schnorchel/);assert.equal(starts.length,0);assert.equal(save.coins,321);
 s.returnToJungle();assert.equal(trips[0].to.id,'Seeufer');trips.shift().done();
 assert.equal(trips[0].to.id,'@jungle');trips.shift().done();
 assert.equal(starts[0].key,'JungleMapScene');assert.equal(starts[0].data.fromWater,true);
 assert.equal(save.currentLevel,'Lianenpfad');assert.equal(save.health,3);assert.equal(save.coins,321);
});
test('returning from the lake consumes its entry animation flag only once',()=>{
 const s=new ctx.JungleMapScene(),data={fromWater:true};s.init(data);assert.equal(s.entryFromWater,true);s.init(data);assert.equal(s.entryFromWater,false);
});
