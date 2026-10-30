const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {safeOasisSpawn,OASIS_WATER}=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/utils/oasis.js'),'utf8').replace(/export /g,'')+'\n({safeOasisSpawn,OASIS_WATER});');

test('oasis spawns remain dry, including large monsters and fixed spawn locations',()=>{
 for(const padding of [40,60])for(let x=60;x<=900;x+=30)for(let y=100;y<=430;y+=20){
  const safe=safeOasisSpawn(x,y,padding);
  assert.equal(safe.x,x);assert.ok(safe.y<=430);
  for(const r of OASIS_WATER)assert.ok(!(safe.x+padding>r.x&&safe.x-padding<r.x+r.width&&safe.y+padding>r.y&&safe.y-padding<r.y+r.height));
 }
});
test('dry playing area and the central boss spawn keep their existing positions',()=>{
 for(const [x,y]of [[480,300],[130,200],[800,260],[620,200],[60,120]]){
  const point=safeOasisSpawn(x,y);assert.equal(point.x,x);assert.equal(point.y,y);
 }
});
