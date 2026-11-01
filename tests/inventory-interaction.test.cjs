const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{EventEmitter}=require('node:events');
const ctx=vm.createContext({performance:{now:()=>100}});
for(const [file,name]of [['utils/controlProfiles.js'],['utils/itemRegistry.js'],['utils/inventory.js'],['utils/weapons.js'],
 ['utils/PortableControls.js','PortableControls'],['ui/InventoryOverlay.js','InventoryOverlay']]){
 let code=fs.readFileSync(path.join(__dirname,'../src',file),'utf8').replace(/^import .*;\n/gm,'');
 if(name)code=code.replace(/export default class \w+/, 'globalThis.'+name+'=class '+name);
 vm.runInContext(code.replace(/export /g,''),ctx);
}
function fixture(profile='ipadKeyboard'){
 const objects=[],changes=[];let saves=0,closes=0;
 const art=(x=0,y=0)=>Object.assign(new EventEmitter(),{x,y,active:true,visible:true,alpha:1,list:[],style:{},
  setDepth(){return this},setScrollFactor(){return this},setOrigin(){return this},setInteractive(){return this},
  setDisplaySize(){return this},setPosition(x,y){this.x=x;this.y=y;return this},
  setVisible(v){this.visible=v;return this},setAlpha(v){this.alpha=v;return this},
  setFillStyle(color,alpha){this.fillColor=color;this.fillAlpha=alpha;return this},
  setStrokeStyle(width,color){this.strokeWidth=width;this.strokeColor=color;return this},
  add(o){this.list.push(...(Array.isArray(o)?o:[o]));return this},
  destroy(){if(!this.active)return;this.active=false;this.list.forEach(o=>o.destroy());this.removeAllListeners()}
 });
 const make=(x,y)=>{const o=art(x,y);objects.push(o);return o};
 const input=new EventEmitter();input.keyboard=new EventEmitter();input.dragDistanceThreshold=0;
 input.setDraggable=o=>{o.draggable=true};
 const scene={gameMode:'jump',input,add:{container:make,rectangle:make,ellipse:make,line:make,circle:make,
  image:(x,y,key)=>Object.assign(make(x,y),{texture:{key}}),text:(x,y,text)=>Object.assign(make(x,y),{text})},
  registry:{get:()=>({playerGender:'male',settings:{controlProfile:profile}})},
  inventory:{weapons:{sword:true,powerHammer:true},passives:{bow:true,shield:true,jungleShield:true,shoes:true},
   armor:{helmet:true},companions:{default:true},consumables:{honey:3}},
  equipped:{weapon:'sword',secondary:'bow',shield:'shield',helmet:'helmet',shoes:'shoes',companion:'default',consumable:'honey',consumable2:null},
  saveInventory(){saves++}
 };
 const overlay=new ctx.InventoryOverlay(scene,{onEquip:(...args)=>changes.push(args),onClose(){closes++}});
 scene.inventoryOverlay=overlay;overlay.open(scene.inventory,scene.equipped);
 return {scene,overlay,objects,changes,saves:()=>saves,closes:()=>closes};
}
test('slot click immediately shows all alternatives on the right; candidate click equips once',()=>{
 const {overlay:o,objects,scene,saves}=fixture();
 assert.equal(o.selection.col,0);assert.equal(o.optionCards.length,3);
 assert.ok(o.optionCards.every(c=>c.frame.x>624));
 o.columns[2].frame.emit('pointerdown');o.columns[2].frame.emit('pointerup');
 assert.equal(o.selection.col,2);assert.equal(o.optionCards.length,3);
 const jungle=o.columns[2].options.findIndex(x=>x.id==='jungleShield');
 const frame=o.optionCards.find(c=>c.row===jungle).frame;
 frame.emit('pointerdown');frame.emit('pointerup');
 assert.equal(scene.equipped.shield,'jungleShield');assert.equal(saves(),1);assert.equal(o.isOpen,true);
 assert.ok(!objects.some(o=>/Alle Plätze sind gleichzeitig aktiv/.test(o.text||'')));
});
test('drag highlights valid primary slot; release there equips without a second click',()=>{
 const {scene,overlay:o,saves}=fixture(),card=o.optionCards.find(c=>o.columns[0].options[c.row].id==='powerHammer').frame;
 scene.input.emit('dragstart',{x:778,y:308},card);
 assert.equal(o.columns[0].frame.strokeWidth,4);assert.equal(o.columns[0].frame.fillAlpha,.32);
 assert.ok(o.columns.slice(1).every(c=>c.frame.alpha===.32),'wrong slots are visibly dimmed');
 scene.input.emit('drag',{x:122,y:174},card);assert.equal(o.ghost.x,122);
 scene.input.emit('dragend',{x:122,y:174},card);
 card.emit('pointerup');
 assert.equal(scene.equipped.weapon,'powerHammer');assert.equal(saves(),1);assert.equal(o.ghost,null);
 assert.ok(o.columns.every(c=>c.frame.alpha===1));
});
test('invalid slot, outside drop and closing mid-drag leave equipment intact',()=>{
 const {scene,overlay:o,saves,closes}=fixture(),before=JSON.stringify(scene.equipped);
 for(const point of [{x:538,y:174},{x:940,y:590}]){
  const card=o.optionCards.find(c=>o.columns[0].options[c.row].id==='powerHammer').frame;
  scene.input.emit('dragstart',{x:778,y:308},card);scene.input.emit('dragend',point,card);
  assert.equal(JSON.stringify(scene.equipped),before);
 }
 const card=o.optionCards.find(c=>o.columns[0].options[c.row].id==='powerHammer').frame;
 scene.input.emit('dragstart',{x:778,y:308},card);o.requestClose();
 scene.input.emit('dragend',{x:122,y:174},card);
 assert.equal(JSON.stringify(scene.equipped),before);assert.equal(saves(),0);assert.equal(closes(),1);
 assert.equal(scene.input.listenerCount('dragend'),0);assert.equal(scene.input.dragDistanceThreshold,0);
});
test('equipped potion moves between pockets while stock and simultaneous equipment remain intact',()=>{
 const {scene,overlay:o}=fixture();
 const card=o.columns[6].frame;
 scene.input.emit('dragstart',{x:268,y:492},card);
 assert.equal(o.columns[6].frame.strokeWidth,4);assert.equal(o.columns[7].frame.strokeWidth,4);
 scene.input.emit('dragend',{x:392,y:492},card);
 assert.equal(scene.equipped.consumable,null);assert.equal(scene.equipped.consumable2,'honey');assert.equal(scene.inventory.consumables.honey,3);
 assert.equal(scene.equipped.weapon,'sword');assert.equal(scene.equipped.secondary,'bow');assert.equal(scene.equipped.shield,'shield');assert.equal(scene.equipped.shoes,'shoes');
 assert.equal(o.canEquip(0,'unowned'),false);assert.equal(o.canEquip(5,'powerHammer'),false);
});
for(const profile of ['ipadKeyboard','pc','ipadTouch'])test(profile+': Enter equips and Esc closes without leaking to scene handlers',()=>{
 const {scene,overlay:o,saves,closes}=fixture(profile);let leaks=0;
 scene.input.keyboard.on('keydown-ENTER',()=>leaks++);scene.input.keyboard.on('keydown-ESC',()=>leaks++);
 const c=Object.create(ctx.PortableControls.prototype);
 Object.assign(c,{activeScene:()=>scene,getProfile:()=>profile,held:new Set(),heldKeys:new Map(),pressedKeys:new Set()});
 o.selection.row=2;
 const press=code=>{const e={code,preventDefault(){},stopImmediatePropagation(){}};c.onKey(e,true);c.onKey(e,false)};
 press('Enter');assert.equal(scene.equipped.weapon,'powerHammer');assert.equal(saves(),1);
 press('Escape');assert.equal(o.isOpen,false);assert.equal(closes(),1);assert.equal(leaks,0);
});
for(const profile of ['ipadKeyboard','pc'])test(profile+': inventory key closes once, even if held/repeated',()=>{
 const {scene,overlay:o,closes}=fixture(profile);
 const c=Object.create(ctx.PortableControls.prototype);let opens=0;
 Object.assign(c,{activeScene:()=>scene,getProfile:()=>profile,held:new Set(),heldKeys:new Map(),pressedKeys:new Set()});
 scene.toggleInventory=()=>opens++;
 const e={code:profile==='pc'?'Tab':'KeyI',preventDefault(){},stopImmediatePropagation(){}};
 c.onKey(e,true);c.onKey(e,true);c.onKey({...e,repeat:true},true);
 assert.equal(o.isOpen,false);assert.equal(closes(),1);assert.equal(opens,0);
 c.onKey(e,false);c.onKey(e,true);assert.equal(opens,1);
});
