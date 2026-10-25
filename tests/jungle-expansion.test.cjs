const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {EventEmitter}=require('node:events');
const ctx={Phaser:{Scene:class{},Input:{Keyboard:{JustDown:k=>!!k.justDown}},Geom:{Rectangle:class{constructor(x,y,width,height){Object.assign(this,{x,y,width,height})}}}},queueMicrotask};
vm.createContext(ctx);
function load(file,name){let src=fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/^import[\s\S]*?;\n/gm,'');if(name)src=src.replace(/export default class \w+/,`globalThis.${name}=class ${name}`);vm.runInContext(src.replace(/export /g,''),ctx)}
load('src/utils/inventory.js');load('src/utils/weapons.js');load('src/utils/jungleRules.js');load('src/utils/companionDrinking.js');load('src/utils/WeaponSwitch.js','WeaponSwitch');load('src/utils/BowManager.js','BowManager');load('src/utils/JungleHazards.js','JungleHazards');load('src/scenes/jungle/JungleScene.js','JungleScene');load('src/ui/ConfirmationDialog.js');load('src/utils/controlProfiles.js');load('src/utils/PortableControls.js','PortableControls');load('src/scenes/shop/ShopSceneBase.js','ShopSceneBase');load('src/scenes/jungle/JungleShopScene.js','JungleShopScene');
const levels=vm.runInContext('JUNGLE_LEVELS',ctx);
function art(x=0,y=0){return {x,y,active:true,visible:true,depth:5,list:[],texture:{key:''},setDepth(){return this},setScrollFactor(){return this},setStrokeStyle(){return this},setInteractive(){return this},setOrigin(){return this},setDisplaySize(){return this},setTint(){return this},setAlpha(){return this},setFlipX(){return this},setRotation(){return this},setVisible(v){this.visible=v;return this},setTexture(k){this.texture.key=k;return this},setPosition(x,y){this.x=x;this.y=y;return this},setText(t){this.text=t;return this},on(){return this},add(objects){this.list.push(...(Array.isArray(objects)?objects:[objects]));return this},destroy(){this.active=false}}}
function bowScene(){return {sys:{settings:{key:'JungleScene'}},gameMode:'jump',equipped:{weapon:'powerHammer',secondary:'bow',shield:null},inventory:{passives:{bow:true}},input:{keyboard:new EventEmitter()},cursors:{up:{isDown:false}},registry:{get:()=>({})},textures:{exists:()=>true},player:Object.assign(art(100,500),{body:{x:80,y:430,width:40,height:60},getData:()=> 'knight-hammer-standing'}),facingX:1,monkeys:[],hazards:{projectiles:[]},add:{image:art},hud:{flashItem(){}},tweens:{add(){}},startSwing(){this.attacks=(this.attacks||0)+1;return true}}}
function ticks(switcher,n){for(let i=0;i<n;i++)switcher.update(.05)}

test('old saves migrate owned bow, shoes and shield to simultaneous slots, preserving explicit empty slots',()=>{
 const save={inventory:{passives:{bow:true,shield:true,shoes:true}},equipped:{passive:'bow'}};
 const n=ctx.normalizeInventory(save);assert.equal(n.equipped.secondary,'bow');assert.equal(n.equipped.shield,'shield');assert.equal(n.equipped.shoes,'shoes');assert.equal(n.equipped.helmet,'helmet');assert.equal(n.equipped.belt,'leatherBelt');
 const next=ctx.applyInventoryToSave(save,n.inventory,{...n.equipped,shield:null});assert.equal(next.equipment.shield,false);assert.equal(ctx.normalizeInventory(next).equipped.shield,null);
});
test('switching to bow and back takes exactly 200ms; an already active weapon attacks without switch delay',()=>{
 const s=bowScene();s.weaponSwitch=new ctx.WeaponSwitch(s);s.bow=new ctx.BowManager(s);
 s.bow.tryShoot();ticks(s.weaponSwitch,3);assert.equal(s.bow.arrows.length,0);ticks(s.weaponSwitch,1);assert.equal(s.bow.arrows.length,1);assert.equal(s.weaponSwitch.hand,'bow');
 s.bow.now=1000;assert.equal(s.bow.tryShoot(),true);assert.equal(s.bow.arrows.length,2);
 s.startSwing();ticks(s.weaponSwitch,3);assert.equal(s.attacks,undefined);ticks(s.weaponSwitch,1);assert.equal(s.attacks,1);s.startSwing();assert.equal(s.attacks,2);
});
test('pending weapon switches pause with the game and cannot attack from inventory',()=>{
 const s=bowScene();s.weaponSwitch=new ctx.WeaponSwitch(s);s.bow=new ctx.BowManager(s);s.bow.tryShoot();s.inventoryOpen=true;ticks(s.weaponSwitch,20);assert.equal(s.bow.arrows.length,0);s.inventoryOpen=false;ticks(s.weaponSwitch,4);assert.equal(s.bow.arrows.length,1);
});
test('explicit upward shots override auto-aim and use upward bow poses for both characters',()=>{
 for(const gender of ['male','female']){const s=bowScene();s.registry.get=()=>({playerGender:gender,settings:{autoAim:true}});s.cursors.up.isDown=true;s.weaponSwitch=new ctx.WeaponSwitch(s);s.bow=new ctx.BowManager(s);s.bow.tryShoot();ticks(s.weaponSwitch,4);assert.equal(s.bow.arrows[0].vx,0);assert.ok(s.bow.arrows[0].vy<0);assert.equal(s.player.texture.key,gender==='female'?'knight-female-bow-up':'knight-bow-up');}
});
test('both taller jungle levels start with only one visible monkey and all perches have support',()=>{
 for(const level of Object.values(levels)){
  assert.ok(level.height>1800);assert.equal(level.monkeys.filter(m=>!m.hidden).length,1);
  for(const m of [...level.monkeys,...(level.boss?[level.bossPosition]:[])])for(const y of m.perches)assert.ok(level.branches.some(p=>Math.abs(p.y-y)<1&&m.x>=p.x&&m.x<=p.x+p.width),`unsupported perch ${m.x},${y}`);
 }
 assert.ok(levels.Lianenpfad.branches.length<levels.Urwaldkronen.branches.length/2);assert.equal(levels.Lianenpfad.vines.length,4);
});
test('every crown branch can be reached with normal jumps and each vine bridges its missing platforms',()=>{
 const branches=levels.Urwaldkronen.branches,reached=new Set([0]);
 for(let pass=0;pass<branches.length;pass++)for(const i of [...reached])branches.forEach((b,j)=>{const a=branches[i],rise=a.y-b.y,disc=480**2-2*1050*rise;if(rise<=0||disc<0)return;const flight=(480+Math.sqrt(disc))/1050,gap=Math.max(0,b.x-a.x-a.width,a.x-b.x-b.width);if(gap<flight*210-15)reached.add(j)});
 assert.equal(reached.size,branches.length);
 for(const v of levels.Lianenpfad.vines){assert.ok(levels.Lianenpfad.branches.some(p=>Math.abs(p.y-v.top)<15&&v.x>=p.x&&v.x<=p.x+p.width));assert.ok(levels.Lianenpfad.branches.some(p=>Math.abs(p.y-v.bottom)<35&&v.x>=p.x&&v.x<=p.x+p.width));}
});
test('a hidden monkey cannot auto-target but an arrow hit reveals it and interrupts its throw',()=>{
 const s=Object.create(ctx.JungleScene.prototype),m={x:150,y:500,hidden:true,active:true,kind:'brown',hp:3,nextThrowAt:0,sprite:art(),leaves:art()};Object.assign(s,{worldTime:1000,monkeys:[m],hazards:{projectiles:[]},playJungleSound(){}});
 assert.equal(ctx.getBowTargets(s)[0].aimable,false);ctx.getBowTargets(s)[0].damage();assert.equal(m.hidden,false);assert.equal(m.hp,2);assert.equal(m.leaves,null);assert.ok(m.nextThrowAt>=1900);
});
test('double-down drops through only the current platform, never the level floor',()=>{
 const s=Object.create(ctx.JungleScene.prototype),b={x:90,right:130,bottom:500,position:{y:430},blocked:{down:true},touching:{down:false},updateCenter(){},setVelocityY(v){this.vy=v}};
 Object.assign(s,{worldTime:1000,lastDownAt:-1000,branches:[{x:0,y:500,width:300},{x:0,y:600,width:960,ground:true}],player:{y:430,body:b}});
 assert.equal(s.tryDropThrough(),false);s.worldTime+=150;assert.equal(s.tryDropThrough(),true);assert.equal(s.dropThroughY,500);assert.equal(b.vy,110);
 b.bottom=600;b.blocked.down=true;s.worldTime+=150;assert.equal(s.tryDropThrough(),false);
});
test('vines support climbing, holding still without gravity, and stepping off',()=>{
 const s=Object.create(ctx.JungleScene.prototype),b={y:1750,bottom:1860,setAllowGravity(v){this.gravity=v;return this},setVelocity(x,y){this.vx=x;this.vy=y},setVelocityY(y){this.vy=y}};Object.assign(s,{worldTime:1000,climbCooldown:0,config:levels.Lianenpfad,player:{x:350,body:b},hazards:{isSticky:()=>false}});
 assert.equal(s.updateClimbing(0,true,false,false),true);assert.equal(b.gravity,false);assert.equal(b.vy,-145);s.updateClimbing(0,false,false,false);assert.equal(b.vy,0);s.updateClimbing(1,false,false,false);assert.equal(s.climbingVine,null);assert.equal(b.gravity,true);
});
function hazardScene(){return {worldTime:0,player:{body:{x:800,y:500,width:40,height:60}},equipped:{companion:'default'},add:{image:art,ellipse:art,circle:art,text:art},tweens:{add(){}},hits:[],takeJungleHit(n){this.hits.push(n)}}}
test('helper slurping makes ten-second puddles disappear three times faster and shows a countdown',()=>{
 const s=hazardScene(),h=new ctx.JungleHazards(s,[]);s.helper={x:400,y:562,visible:true};const p=h.addPuddle(400,562);
 for(let i=0;i<66;i++){s.worldTime+=50;h.update(.05)}assert.equal(h.puddles.length,1);assert.ok(p.label.text.includes('schlürft'));s.worldTime+=50;h.update(.05);assert.equal(h.puddles.length,0);
});
for(const [kind,damage] of [['brown',1],['red',2],['blue',3]])test(`jungle shield reflects ${kind} coconut for normal ${damage} damage without hurting the hero`,()=>{
 const s=hazardScene(),owner={x:600,y:540,active:true};s.monkeys=[owner];s.enemyBounds=m=>({x:m.x-20,y:m.y-60,width:40,height:60});s.damageMonkey=(m,d)=>{m.damage=d};s.shield={kind:'jungleShield',active:true,tryBlockHit(){if(!this.active)return false;this.active=false;return true}};
 const h=new ctx.JungleHazards(s,[]),p=h.throw(kind,{x:810,y:520},{x:810,y:530},owner);h.update(.016);assert.equal(p.reflected,true);assert.equal(s.shield.active,false);assert.equal(s.hits.length,0);
 for(let i=0;i<100&&h.projectiles.length;i++){s.worldTime+=16;h.update(.016)}assert.equal(owner.damage,damage);assert.equal(h.projectiles.length,0);assert.equal(s.hits.length,0);
});
test('active-profile keys and toolbar choose the same confirmation exactly once',()=>{
 const s={input:{keyboard:new EventEmitter()},events:new EventEmitter(),time:{},physics:{world:{pause(){},resume(){}}},add:{container:art,rectangle:art,text:art}};let yes=0;ctx.showConfirmation(s,'Verlassen?',()=>yes++);const c=Object.create(ctx.PortableControls.prototype);c.activeScene=()=>s;
 const ev=code=>({code,preventDefault(){},stopImmediatePropagation(){}});c.onKey(ev('KeyQ'),true);assert.equal(yes,0);assert.equal(s.confirmation,null);ctx.showConfirmation(s,'Verlassen?',()=>yes++);c.onKey(ev('Enter'),true);c.onKey(ev('Enter'),false);assert.equal(yes,1);
});
test('buying the jungle shield costs 200, equips independently, and duplicate purchases are disabled',()=>{
 const s=Object.create(ctx.ShopSceneBase.prototype);Object.assign(s,{coins:600,...ctx.normalizeInventory({inventory:{passives:{bow:true,shoes:true}},equipped:{passive:'bow'}}),updateHudAfterPurchase(){},saveInventory(){},showPurchaseMessage(){}});const item=ctx.JungleShopScene.prototype.getShopConfig().items.find(i=>i.id==='jungleShield');s.buyItem(item);assert.equal(s.coins,400);assert.equal(s.equipped.shield,'jungleShield');assert.equal(s.equipped.secondary,'bow');assert.equal(s.equipped.shoes,'shoes');assert.equal(s.canShowItem(item),false);s.buyItem(item);assert.equal(s.coins,400);
});

test('an open confirmation ignores inventory, shooting and pause actions',()=>{
 let choose=0,inventory=0;const s={confirmation:{isOpen:true,choose(){choose++}},toggleInventory(){inventory++}};
 const c=Object.create(ctx.PortableControls.prototype);c.activeScene=()=>s;c.dispatch('inventory');c.dispatch('shoot');c.dispatch('pause');assert.equal(choose,0);assert.equal(inventory,0);c.dispatch('confirm');assert.equal(choose,1);
});
load('src/utils/UndergroundBats.js','UndergroundBats');
test('the jungle shield also returns underground poison berries without player damage',()=>{
 const bat=Object.assign(art(100,200),{getData:()=>0}),data={velocityY:100,owner:bat};
 const berry=Object.assign(art(100,300),{setData(k,v){data[k]=v;return this},getData:k=>data[k]});
 let blocks=0,hits=0,damage=0;const scene={player:{body:{x:90,y:290,width:20,height:30}},shield:{kind:'jungleShield',tryBlockHit(){blocks++;return true}},applyFlyingEnemyHit(){hits++}};
 const system=Object.create(ctx.UndergroundBats.prototype);Object.assign(system,{scene,group:{getChildren:()=>[bat]},blockHit:()=>null,damage(m,n){damage=n},burstBerry(){berry.active=false}});
 system.updateBerry(berry,.016);assert.equal(data.reflected,true);assert.equal(blocks,1);assert.equal(hits,0);assert.ok(data.velocityY<0);
 for(let i=0;i<50&&berry.active;i++)system.updateBerry(berry,.016);assert.equal(damage,2);assert.equal(hits,0);
});
load('src/utils/potions.js');
test('the second potion slot heals and saves without unequipping bow, shield or shoes',()=>{
 const gear={weapon:'powerHammer',secondary:'bow',shield:'jungleShield',shoes:'shoes',consumable:'honey',consumable2:'honey'};
 let saves=0;const s={equipped:gear,health:2,maxHealth:5,inventory:{consumables:{honey:2}},hud:{tryUseHoney:()=>({consumed:true,health:5,count:1,companionRespawnAt:0}),setHealth(){},setConsumableCount(){}},saveState(){saves++}};
 assert.equal(ctx.useBeltPotion(s),true);assert.equal(s.health,5);assert.equal(s.inventory.consumables.honey,1);assert.equal(s.equipped.secondary,'bow');assert.equal(s.equipped.shield,'jungleShield');assert.equal(s.equipped.shoes,'shoes');assert.equal(saves,1);
});
