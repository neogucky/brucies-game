const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{EventEmitter}=require('node:events');
const root=path.join(__dirname,'..');
const ctx={performance:{now:()=>100},Phaser:{Scene:class{}},queueMicrotask};vm.createContext(ctx);
function load(file,name){let code=fs.readFileSync(path.join(root,file),'utf8').replace(/^import[\s\S]*?;\n/gm,'');if(name)code=code.replace(/export default class \w+/,`globalThis.${name}=class ${name}`);vm.runInContext(code.replace(/export /g,''),ctx)}
load('src/utils/controlProfiles.js');load('src/utils/PortableControls.js','PortableControls');load('src/utils/ControlLabels.js','ControlLabels');load('src/utils/jungleRules.js');load('src/utils/expertKnowledge.js');load('src/utils/inventory.js');load('src/saveManager.js');load('src/utils/weapons.js');load('src/utils/WeaponSwitch.js','WeaponSwitch');load('src/utils/BowManager.js','BowManager');load('src/scenes/jungle/JungleScene.js','JungleScene');
const {profiles,levels,experts}=vm.runInContext('({profiles:CONTROL_PROFILES,levels:JUNGLE_LEVELS,experts:EXPERT_WORLDS})',ctx);
const event=code=>({code,key:code,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}});
function controls(scene,profile='ipadKeyboard'){const c=Object.create(ctx.PortableControls.prototype);c.getProfile=()=>profile;c.activeScene=()=>scene;c.focus=()=>{};c.held=new Set();return c}
function art(x=0,y=0){return {x,y,active:true,visible:true,texture:{key:''},setDepth(){return this},setDisplaySize(){return this},setFlipX(){return this},setTint(){return this},setPosition(x,y){this.x=x;this.y=y;return this},setTexture(key){this.texture.key=key;return this},setVisible(v){this.visible=v;return this},setRotation(){return this},destroy(){this.active=false}}}

test('uncertain hardware always defaults to iPad with keyboard; profile choices are explicit',()=>{
 assert.equal(ctx.controlProfileId(), 'ipadKeyboard');assert.equal(ctx.controlProfileId('unknown'),'ipadKeyboard');assert.equal(Object.keys(profiles).length,3);assert.equal(Object.keys(profiles.ipadTouch.keys).length,0);
});
for(const profile of ['ipadKeyboard','pc'])test(`${profile}: exactly one key for each action, with no ambiguous assignments`,()=>{
 const keys=Object.values(profiles[profile].keys);assert.equal(new Set(keys).size,keys.length);assert.equal(Array.isArray(profiles[profile].keys.confirm),false);assert.equal(Array.isArray(profiles[profile].keys.back),false);
 assert.equal(ctx.actionForKey({code:profile==='pc'?'KeyE':'Enter'},profile),null);assert.equal(ctx.actionForKey({code:profile==='pc'?'KeyQ':'Escape'},profile),null);
 for(const code of ['KeyJ','KeyN','Backspace','KeyW','KeyA','KeyS','KeyD'])assert.equal(ctx.actionForKey({code},profile),null);
});
for(const profile of Object.keys(profiles))test(`${profile}: displayed confirmation keys and real input agree`,()=>{
 let yes=0,no=0;const s={confirmation:{isOpen:true,choose(answer){if(answer)yes++;else no++}}},c=controls(s,profile);
 if(profile==='ipadTouch'){
  assert.equal(ctx.actionLabel(profile,'confirm','Ja'),'Ja');assert.equal(ctx.actionLabel(profile,'back','Nein'),'Nein');
  for(const code of ['Enter','Escape','KeyE','KeyQ','KeyJ','KeyN'])c.onKey(event(code),true);
  assert.equal(yes+no,0);c.dispatch('confirm');c.dispatch('back');
 }else{
  const yesCode=profiles[profile].keys.confirm,noCode=profiles[profile].keys.back;
  c.onKey(event(yesCode),true);c.onKey({...event(yesCode),repeat:true},true);c.onKey(event(yesCode),false);c.onKey(event(noCode),true);
  assert.equal(ctx.formatControlHint('Ja · {confirm}',profile),ctx.actionLabel(profile,'confirm','Ja'));
  assert.equal(ctx.formatControlHint('Nein · {back}',profile),ctx.actionLabel(profile,'back','Nein'));
 }
 assert.equal(yes,1);assert.equal(no,1);
});
test('profile change refreshes open UI text and later text changes keep their templates',()=>{
 const text={scene:{},active:true,text:'Ja · {confirm}',setText(v){this.text=v;return this}};
 const s={children:{list:[text]},add:{text:()=>({})}},formatter=new ctx.ControlLabels(s);
 formatter.update('ipadKeyboard');assert.equal(text.text,'Ja · E');formatter.update('pc');assert.equal(text.text,'Ja · Enter');formatter.update('ipadTouch');assert.equal(text.text,'Ja');
 text.setText('Nein · {back}');formatter.update('ipadKeyboard');assert.equal(text.text,'Nein · Q');formatter.destroy();
});
test('touch map hints keep the named action instead of leaving empty colons',()=>{
 const text=ctx.formatControlHint('{move}: Bewegen · {confirm}: Betreten · {inventory}: Inventar · {back}: Menü','ipadTouch');
 assert.ok(text.includes('Antippen: Betreten'));assert.ok(text.includes('Zurück: Menü'));assert.ok(!text.includes('E:'));
});
test('only Back closes an inventory; its open key does not act as a second close key',()=>{
 let close=0,confirm=0;const s={inventoryOverlay:{isOpen:true,close(){close++},onClose(){},confirm(){confirm++}}},c=controls(s);c.dispatch('inventory');assert.equal(close,0);c.dispatch('confirm');assert.equal(confirm,1);c.dispatch('back');assert.equal(close,1);
});
test('Space never doubles as dialog confirmation',()=>{
 let pages=0;const s={dialog:{container:{visible:true},pages:[{}],index:0,nextPage(){pages++}}},c=controls(s);c.onKey(event('Space'),true);assert.equal(pages,0);c.onKey(event('KeyE'),true);assert.equal(pages,1);
});
test('Back from pause opens the exit prompt even while Phaser is still queuing scene resume',()=>{
 const keyboard=new EventEmitter();let prompts=0;keyboard.on('keydown-ESC',()=>prompts++);
 const s={input:{keyboard},time:{now:100},scene:{resume(){}}},c=controls(s);c.pausedScene=s;c.activeScene=()=>c.pausedScene;
 c.dispatch('back');assert.equal(c.pausedScene,null);assert.equal(prompts,1);
});
for(const [sceneKey,map] of [['DesertRuinScene','DessertMapScene'],['DesertEndlessScene','DessertMapScene'],['DesertTunnelScene','DessertMapScene'],['UndergroundDigScene','UndergroundMapScene'],['JungleScene','JungleMapScene']])test(`${sceneKey}: defeated Back returns to its map with full hearts`,()=>{
 let target,saved=0;const s={sys:{settings:{key:sceneKey}},isGameOver:true,health:0,maxHealth:5,time:{paused:true},scene:{start(key){target=key}},saveInventory(){saved++}},c=controls(s);c.dispatch('back');assert.equal(target,map);assert.equal(s.health,5);assert.equal(s.companionHealth,1);assert.equal(saved,1);assert.equal(s.time.paused,false);
});
test('winning screens continue with Confirm only; Back cannot become a duplicate continue key',()=>{
 const keyboard=new EventEmitter();let continueCount=0;keyboard.on('keydown-ENTER',()=>continueCount++);const s={input:{keyboard},levelCompleted:true},c=controls(s);c.dispatch('back');assert.equal(continueCount,0);c.dispatch('confirm');assert.equal(continueCount,1);
});
for(const [world,expert] of Object.entries(experts))test(`${world}: free professor location is saved in the right world and has enemy, equipment and level tips`,()=>{
 const save=ctx.normalizeWorldProgress({currentWorld:world,currentLevel:expert.id,coins:43,unlockedWorlds:[world],unlockedLevels:[]});
 assert.equal(save.currentWorld,world);assert.equal(save.coins,43);assert.ok(save.unlockedLevels.includes(expert.id));assert.equal(ctx.worldForLevel(expert.id),world);
 for(const category of ['Gegner','Ausrüstung','Level']){assert.ok(expert.topics[category].length>=3);for(const [title,detail] of expert.topics[category]){assert.ok(title.length>3);assert.ok(detail.length>60)}}
});
test('experts unlock with their world, without opening later worlds or boss levels',()=>{
 const a=ctx.normalizeWorldProgress({currentLevel:'Wuestenruine'});assert.ok(a.unlockedLevels.includes('Wuestenexperte'));assert.ok(!a.unlockedLevels.includes('Unterweltexperte'));assert.ok(!a.unlockedWorlds.includes('underground'));
 const b=ctx.normalizeWorldProgress({currentLevel:'UnderShop'});assert.ok(b.unlockedLevels.includes('Unterweltexperte'));assert.ok(!b.unlockedLevels.includes('Kristalltiefen'));assert.ok(!b.unlockedWorlds.includes('jungle'));
 const c=ctx.normalizeWorldProgress({currentLevel:'UrwaldShop'});assert.ok(c.unlockedLevels.includes('Urwaldexperte'));assert.ok(!c.unlockedLevels.includes('Lianenpfad'));
});
for(const [world,file,start] of [['desert','src/scenes/DessertMapScene.js','Wuestenruine'],['underground','src/scenes/UndergroundMapScene.js','UnderShop'],['jungle','src/scenes/jungle/JungleMapScene.js','UrwaldShop']])test(`${world}: the expert is a real connected map node near the entry`,()=>{
 const source=fs.readFileSync(path.join(root,file),'utf8'),match=source.match(/const (?:JUNGLE_)?NODES = (\[[\s\S]*?\n\]);/);const nodes=vm.runInNewContext('('+match[1]+')');const first=nodes.find(n=>n.id===start),expert=nodes.find(n=>n.id===experts[world].id);assert.ok(expert);assert.ok(Object.values(first.neighbors).includes(expert.id));assert.ok(Object.values(expert.neighbors).includes(start));assert.ok(source.includes('"ExpertScene"'));
});
for(const level of Object.values(levels))test(`${level.name}: monkeys scurry to a real tree/vine before changing height`,()=>{
 for(const entry of [...level.monkeys,...(level.boss?[level.bossPosition]:[])])for(const targetY of entry.perches.filter(y=>y!==entry.y)){
  const m={...entry,homeX:entry.x},route=ctx.planMonkeyClimb(level,m,targetY);assert.ok(route,`missing climb ${m.x},${m.y} -> ${targetY}`);m.climbRoute=route;const anchor=route.anchorX;assert.ok([110,850,...(level.vines||[]).map(v=>v.x)].includes(anchor));let finished=false;
  for(let i=0;i<1000;i++){const beforeY=m.y,phase=ctx.advanceMonkeyClimb(m,.05);if(m.y!==beforeY)assert.equal(m.x,anchor);if(phase==='done'){finished=true;break}}
  assert.ok(finished);assert.equal(m.y,targetY);assert.ok(level.branches.some(p=>p.y===m.y&&m.x>=p.x&&m.x<=p.x+p.width));
 }
});
test('a center monkey uses a connecting vine; unsupported free-air climbing is rejected',()=>{
 const l=levels.Lianenpfad,m={x:480,y:1500,homeX:480};const route=ctx.planMonkeyClimb(l,m,1040);assert.equal(route.anchorX,610);
 assert.equal(ctx.planMonkeyClimb(levels.Urwaldkronen,{x:480,y:1660},1460),null);
});
function climber(gender='male'){
 const s=Object.create(ctx.JungleScene.prototype),body={y:1750,bottom:1850,velocity:{},setAllowGravity(v){this.gravity=v;return this},setVelocity(x,y){this.velocity={x,y}},setVelocityY(y){this.velocity.y=y}};
 Object.assign(s,{worldTime:1000,climbCooldown:0,config:levels.Lianenpfad,player:Object.assign(art(350,1850),{body,getData:()=>gender==='female'?'knight-female-hammer-standing':'knight-hammer-standing'}),registry:{get:()=>({playerGender:gender})},textures:{exists:()=>true},hazards:{isSticky:()=>false},swordHitbox:art(),weaponSwitch:{hand:'bow',pending:{}},isSwinging:true,hammerSlamActive:true});return s;
}
for(const gender of ['male','female'])test(`${gender}: climbing uses a weapon-free asset and cancels pending attacks`,()=>{
 const s=climber(gender);assert.equal(s.updateClimbing(0,true,false,false,.016),true);assert.ok(s.player.texture.key.includes(gender==='female'?'knight-female-climb-':'knight-climb-'));assert.equal(s.isSwinging,false);assert.equal(s.hammerSlamActive,false);assert.equal(s.swordHitbox.visible,false);assert.equal(s.weaponSwitch.pending,null);assert.equal(s.startSwing(),false);assert.equal(s.activateHammerSlam(),false);
 s.updateClimbing(1,true,false,false,.016);assert.equal(s.climbingVine,null);assert.ok(s.player.body.velocity.y<0);assert.ok(s.player.texture.key.includes('hammer-standing'));
});
test('weapon switching cannot attack while climbing and hides the back weapon display',()=>{
 const s=climber();s.sys={settings:{key:'JungleScene'}};let hits=0;s.startSwing=()=>hits++;const weapon=new ctx.WeaponSwitch(s);s.climbingVine={};weapon.backShield=art();assert.equal(s.startSwing(),false);weapon.pending={kind:'bow',readyAt:0,action:()=>hits++};weapon.update(.05);assert.equal(hits,0);assert.equal(weapon.pending,null);assert.equal(weapon.backShield.visible,false);
});
test('descending releases the vine before the body can pass through the ground; reaching up from below still works',()=>{
 const down=climber();down.player.body.bottom=1990;down.player.body.y=1882;
 down.updateClimbing(0,false,true,false,.016);assert.equal(down.climbingVine,null);assert.equal(down.player.body.gravity,true);assert.ok(down.player.body.bottom<2062);
 const up=climber();up.player.body.bottom=2010;up.player.body.y=1902;
 up.updateClimbing(0,true,false,false,.016);assert.ok(up.climbingVine);assert.equal(up.player.body.gravity,false);
});
test('climbing forbids new arrows while existing arrows keep flying',()=>{
 const s={input:{keyboard:new EventEmitter()},gameMode:'jump',equipped:{secondary:'bow'},inventory:{passives:{bow:true}},player:Object.assign(art(100,500),{body:{x:80,y:430,width:40,height:60}}),facingX:1,monkeys:[],hazards:{projectiles:[]},add:{image:art},tweens:{add(){}}};
 const bow=new ctx.BowManager(s);assert.equal(bow.tryShoot(),true);const arrow=bow.arrows[0],x=arrow.x;s.climbingVine={};assert.equal(bow.tryShoot(),false);bow.update(.05);assert.ok(arrow.x>x);
});
load('src/ui/ConfirmationDialog.js');
test('fixed confirmation buttons use the camera scroll factor for both drawing and pointer hit testing',()=>{
 const objects=[];
 function object(x=0,y=0){const o={x,y,list:[],scrollFactorY:1,setDepth(){return this},setOrigin(){return this},setStrokeStyle(){return this},setInteractive(){return this},setScrollFactor(value){this.scrollFactorY=value;return this},add(children){this.list.push(...(Array.isArray(children)?children:[children]));return this},on(name,handler){this[name]=handler;return this},destroy(){}};objects.push(o);return o}
 const s={time:{paused:false},physics:{world:{pause(){},resume(){}}},events:new EventEmitter(),add:{container:object,rectangle:object,text(x,y,text){return Object.assign(object(x,y),{text})}}};let yes=0;
 ctx.showConfirmation(s,'Verlassen?',()=>yes++);const root=objects[0],button=root.list.find(o=>o.text?.startsWith('Ja'));
 assert.ok(button);assert.equal(root.scrollFactorY,0);assert.equal(button.scrollFactorY,0);
 const cameraScroll=1520,pointerWorldY=350+cameraScroll,buttonPointerY=pointerWorldY-cameraScroll*(1-button.scrollFactorY);assert.equal(buttonPointerY,button.y);
 button.pointerdown();assert.equal(yes,1);
});
load('src/scenes/MainMenuScene.js','MainMenuScene');
test('starting a new game preserves the selected device profile',()=>{
 let save={settings:{controlProfile:'pc'}},target;ctx.localStorage={setItem(){},removeItem(){}};
 const s=Object.create(ctx.MainMenuScene.prototype);s.registry={get:()=>save,set(_key,value){save=value}};s.scene={start(key){target=key}};
 s.startNewGame();assert.equal(save.settings.controlProfile,'pc');assert.equal(target,'CharacterSelectScene');
});

load('src/scenes/desert/DesertRuinScene.js','DesertRuinScene');
test('a completed ruin stays playable on revisits: inventory, weapons and leaving remain available',()=>{
 const s=Object.create(ctx.DesertRuinScene.prototype),keyboard=new EventEmitter();let opened=0,exits=0;
 Object.assign(s,{registry:{get:()=>({health:5,completedLevels:['Wuestenruine']}),set(){}},time:{now:100},maxHealth:5,shield:{setHud(){},initFromSave(){},destroy(){}},input:{keyboard},sys:{settings:{key:'DesertRuinScene'}}});
 s.resetState();assert.equal(s.ruinPreviouslyCompleted,true);assert.equal(s.isComplete,false);
 s.toggleInventory=()=>opened++;keyboard.on('keydown-ESC',()=>exits++);
 const c=controls(s);c.dispatch('inventory');c.dispatch('back');assert.equal(opened,1);assert.equal(exits,1);
 const bow=new ctx.BowManager(s);assert.equal(Boolean(bow.isBlocked()),false);
 const weapon=new ctx.WeaponSwitch(s);assert.equal(Boolean(weapon.blocked()),false);
});
