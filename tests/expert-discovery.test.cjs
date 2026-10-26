const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function fixture(save={}) {
  let stored=null,writes=0;
  const localStorage={getItem:()=>stored,setItem(key,value){stored=value;writes++;},removeItem(){stored=null}};
  const ctx=vm.createContext({localStorage});
  for(const file of ['src/utils/inventory.js','src/utils/expertKnowledge.js','src/saveManager.js','src/utils/expertDiscovery.js']) {
    const code=fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');vm.runInContext(code,ctx);
  }
  const scene={registry:{get:()=>save,set(key,next){save=next}},time:{now:1000},cameras:{main:{worldView:{x:0,y:0,width:960,height:600}}}};
  return {ctx,scene,save:()=>save,writes:()=>writes};
}
const enemy=(data={},overrides={})=>({active:true,visible:true,alpha:1,getData:key=>data[key],getBounds:()=>({x:300,y:300,width:70,height:70}),...overrides});
const group=(...enemies)=>({getChildren:()=>enemies});

test('seeing a red mole unlocks only its own color; hidden, emerging, dead and offscreen foes stay unknown',()=>{
  const {ctx,scene}=fixture();
  scene.monsters=group(enemy({type:'red'}),enemy({type:'blue',emerging:true}),enemy({type:'boss'},{visible:false}),enemy({type:'normal'},{active:false}),enemy({type:'blue'},{getBounds:()=>({x:1000,y:400,width:70,height:70})}));
  assert.deepEqual(Array.from(ctx.sceneDiscoveryIds(scene)),['mole-red']);
});

test('enemies on a scrolled camera count only where their actual image is visible',()=>{
  const {ctx,scene}=fixture();scene.cameras.main.worldView.y=1200;
  scene.batsGroup=group(enemy(),enemy({}, {getBounds:()=>({x:300,y:1240,width:86,height:60})}));
  assert.deepEqual(Array.from(ctx.sceneDiscoveryIds(scene)),['bat']);
});

test('hidden monkeys remain unknown until revealed; a visible boss is recorded separately',()=>{
  const {ctx,scene}=fixture();
  scene.monkeys=[{active:true,hidden:true,kind:'red',sprite:enemy()},{active:true,hidden:false,kind:'brown',sprite:enemy()},{active:false,kind:'blue',sprite:enemy()}];
  scene.boss={active:true,isBoss:true,kind:'brown',sprite:enemy()};
  assert.deepEqual(Array.from(ctx.sceneDiscoveryIds(scene)),['monkey-brown','monkey-king']);
  scene.monkeys[0].hidden=false;assert.ok(ctx.sceneDiscoveryIds(scene).includes('monkey-red'));
});

test('stone monsters, both underground bosses and the king\'s thrown stones have their own cards',()=>{
  const {ctx,scene}=fixture();
  scene.stoneMonstersGroup=group(enemy(),enemy({isStoneBoss:true}),enemy({isStoneBoss:true,bossConfig:{isSuperBoss:true}}));
  scene.hazards={projectiles:[{kind:'stone',sprite:enemy()},{kind:'brown',sprite:enemy()}]};
  assert.deepEqual(Array.from(ctx.sceneDiscoveryIds(scene)),['stone','stone-guardian','stone-titan','stone']);
});

for(const state of [{isLoading:true},{isPaused:true},{isGameOver:true},{startScreen:{visible:true}},{dialog:{container:{visible:true}}}])test('covered or paused gameplay does not reveal encounters: '+JSON.stringify(state),()=>{
  const {ctx,scene}=fixture();Object.assign(scene,state,{monsters:group(enemy({type:'red'}))});assert.equal(ctx.sceneDiscoveryIds(scene).length,0);
});

test('all-level preview and completed levels do not fabricate any sightings',()=>{
  const {ctx,scene}=fixture({completedLevels:['Fremdweg','Kristalltiefen','Urwaldkronen'],unlockedWorlds:['desert','underground','jungle']});
  const preview=ctx.unlockAllForTesting(scene.registry.get(),'jungle');
  assert.equal(ctx.knownDiscoveryIds(preview).size,0);assert.equal(ctx.sceneDiscoveryIds(scene).length,0);
});

test('old owned equipment is known, but missing or unowned items stay unknown',()=>{
  const {ctx}=fixture();
  const ids=ctx.ownedDiscoveryIds({inventory:{weapons:{sword:true,powerHammer:false},passives:{shield:true,bow:false},consumables:{honey:0},companions:{default:true}}});
  assert.deepEqual(Array.from(ids),['sword','shield','companion']);
  assert.deepEqual(Array.from(ctx.ownedDiscoveryIds({equipment:{shield:true,shoes:true},consumables:{honey:2}})),['honey','shield','shoes']);
});

test('new discoveries persist once, survive save/load and spending a consumable, and preserve other progress',()=>{
  const {ctx,scene,save,writes}=fixture({coins:337,health:4,inventory:{consumables:{honey:1}},settings:{autoAim:true},expertIntroductions:{desert:true}});
  assert.equal(ctx.recordDiscoveries(scene,['mole-red','honey','mole-red','not-a-card']),true);assert.equal(writes(),1);
  assert.equal(ctx.recordDiscoveries(scene,['mole-red','honey']),false);assert.equal(writes(),1);
  const loaded=ctx.loadSave();assert.deepEqual(Array.from(loaded.discoveries),['mole-red','honey']);assert.equal(loaded.coins,337);assert.equal(loaded.health,4);assert.equal(loaded.settings.autoAim,true);assert.equal(loaded.expertIntroductions.desert,true);
  save().inventory.consumables.honey=0;assert.ok(ctx.knownDiscoveryIds(save()).has('honey'));
});

test('tracking saves a visible red mole once without repeatedly writing during normal play',()=>{
  const {ctx,scene,save,writes}=fixture({coins:27});scene.inventory={weapons:{sword:true}};scene.monsters=group(enemy({type:'red'}));
  ctx.trackSceneDiscoveries(scene);assert.equal(writes(),1);assert.ok(save().discoveries.includes('mole-red'));
  for(let i=0;i<60;i++){scene.time.now+=16;ctx.trackSceneDiscoveries(scene)}assert.equal(writes(),1);
  scene.monsters=group(enemy({type:'blue'}));scene.time.now+=250;ctx.trackSceneDiscoveries(scene);assert.equal(writes(),2);assert.equal(save().coins,27);assert.ok(save().discoveries.includes('mole-blue'));
});

test('invalid discovery data from an old save is ignored safely',()=>{
  const {ctx}=fixture();assert.equal(ctx.knownDiscoveryIds({discoveries:'oops'}).size,0);assert.deepEqual(Array.from(ctx.knownDiscoveryIds({discoveries:['mole-red','unknown',null]})),['mole-red']);
});

test('the desert rolling boulder is discovered separately from underground stone monsters',()=>{
  const {ctx,scene}=fixture();scene.rollingStones=group(enemy());
  assert.deepEqual(Array.from(ctx.sceneDiscoveryIds(scene)),['rolling-rock']);
});
