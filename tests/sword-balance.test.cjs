const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
for(const name of ['DesertRuinScene','DesertEndlessScene','DesertTunnelScene']){
 test(name+': wider sword and shorter repeat delay also apply in the desert',()=>{
  const ctx=vm.createContext({Phaser:{Scene:class{}}});
  for(const file of ['src/utils/weapons.js','src/scenes/desert/'+name+'.js']){
   let code=fs.readFileSync(path.join(root,file),'utf8').replace(/^import[\s\S]*?;\n/gm,'');
   code=code.replace(/export default class (\w+)/,'globalThis.$1=class $1');
   vm.runInContext(code.replace(/export /g,''),ctx);
  }
  const hitbox={body:{setSize(){},setEnable(){}},setSize(w,h){this.width=w;this.height=h;return this},
   setPosition(x,y){this.x=x;this.y=y;return this},setVisible(){return this}};
  const s=Object.create(ctx[name].prototype);
  Object.assign(s,{equipped:{weapon:'sword'},attackCooldown:350,lastAttackAt:0,swordSwingId:0,
   time:{now:299,delayedCall(delay,callback){return {delay,callback,remove(){}}}},
   player:{x:300,y:400,getData(){},setTexture(){return this},setScale(){return this}},
   facing:{x:1,y:0},swordHitbox:hitbox});
  s.positionSword();
  assert.ok(Math.abs(hitbox.width-45.36)<1e-8,'new reach retains the desert perspective scale');
  assert.ok(Math.abs(hitbox.x+hitbox.width/2-344.52)<1e-8);
  s.swingSword();assert.equal(s.swordSwingId,0,'cannot attack before the repeat delay');
  s.time.now=300;s.swingSword();assert.equal(s.swordSwingId,1);
  assert.equal(s.swingTimer.delay,120,'animation and damage window are faster too');
  s.time.now=599;s.swingSword();assert.equal(s.swordSwingId,1);
  s.time.now=600;s.swingSword();assert.equal(s.swordSwingId,2,'next attack is accepted at the new delay');
 });
}
