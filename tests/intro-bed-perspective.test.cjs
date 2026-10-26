const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/utils/introBedGeometry.js'),'utf8').replace(/export /g,''),ctx);
const {matrix,source,feet,borders}=vm.runInContext('({matrix:INTRO_BED_PROJECTION,source:INTRO_BED_SOURCE_FEET,feet:INTRO_BED_FEET,borders:INTRO_RUG_BORDERS})',ctx);
test('painted post bottoms register to the two measured gold carpet borders',()=>{
 const targets=[feet.footFar,feet.footNear,feet.headNear];
 for(let i=0;i<source.length;i++){
  const p=ctx.projectIntroBedPoint(matrix,source[i].x,source[i].y),line=i===2?borders.upper:borders.lower;
  assert.ok(Math.hypot(p.x-targets[i].x,p.y-targets[i].y)<1e-7);
  assert.ok(Math.abs(p.y-line.slope*p.x-line.intercept)<.01);
 }
 const hidden=feet.headFar;
 assert.ok(Math.abs(hidden.y-borders.upper.slope*hidden.x-borders.upper.intercept)<.01);
});
test('perspective registration preserves upright posts and the left-to-right order',()=>{
 let last=-Infinity;
 for(let x=0;x<=1536;x+=32){
  const top=ctx.projectIntroBedPoint(matrix,x,0),bottom=ctx.projectIntroBedPoint(matrix,x,1024);
  assert.equal(top.x,bottom.x);assert.ok(bottom.y>top.y);
  assert.ok(top.x>last);last=top.x;
 }
});
test('the whole front footboard base follows the lower carpet line without bending',()=>{
 const [a,b]=source;
 for(let i=0;i<=50;i++){
  const t=i/50,p=ctx.projectIntroBedPoint(matrix,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);
  assert.ok(Math.abs(p.y-borders.lower.slope*p.x-borders.lower.intercept)<.01);
 }
});
