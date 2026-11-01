const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {readRgba}=require('./helpers/png-rgba.cjs'),root=path.join(__dirname,'..');
const ctx=vm.createContext({animationPaused:s=>Boolean(s.isPaused||s.inventoryOpen||s.confirmation?.isOpen||s.isInteractingWithLever)});
for(const file of ['enemyMotionAssets','EnemyAnimation']){
 let code=fs.readFileSync(path.join(root,'src/utils',file+'.js'),'utf8').replace(/^import .*;\n/gm,'');
 code=code.replace('export default class EnemyAnimation','globalThis.EnemyAnimation=class EnemyAnimation').replace(/export /g,'');vm.runInContext(code,ctx);
}
const specs=JSON.parse(fs.readFileSync(path.join(root,'assets/common/enemies/frames.json')));
function sprite(key,x=100,y=300){return{active:true,visible:true,x,y,width:94,height:90,scaleX:.7,scaleY:.7,flipX:false,
 texture:{key},data:{},body:{width:40,height:50,velocity:{x:70,y:0}},
 getData(k){return this.data[k]},setData(k,v){this.data[k]=v;return this},
 setFrame(frame){this.frame=frame;return this},setTexture(key){this.texture={key};return this}};}
const assets=Object.fromEntries(['desert-mole-running','desert-mole-digging','desert-mole-charging','desert-mole-attacking',
 ...['brown','red','blue','king'].flatMap(k=>['monkey-'+k,'monkey-'+k+'-climbing','monkey-'+k+'-throwing'])].map(k=>[k,Array.from({length:8},(_,i)=>'motion-'+i)]));
function fixture(){const mole=sprite('desert-mole-running'),m={active:true,kind:'red',sprite:sprite('monkey-red'),x:100,y:300,stunnedUntil:0};
 const s={time:{now:1000},worldTime:1000,registry:{get:k=>k==='enemy-motion-assets'?assets:specs},
 monsters:{getChildren:()=>[mole]},monkeys:[m]};return{s,mole,m,a:new ctx.EnemyAnimation(s)};}

test('walk and climb advance by distance, rather than sliding on a timed stand image',()=>{
 for(const state of ['walk','climb']){
  assert.equal(ctx.enemyFrame(state,0,0),ctx.enemyFrame(state,5000,0),'waiting does not step');
  assert.equal(new Set([0,13,26,39].map(d=>ctx.enemyFrame(state,0,d))).size,4);
 }
});
test('real mole movement cycles the full body without touching its physics, scale or facing',()=>{
 const {s,mole,a}=fixture(),before={x:mole.x,y:mole.y,width:mole.width,height:mole.height,scaleX:mole.scaleX,scaleY:mole.scaleY,flipX:mole.flipX,body:{...mole.body}},frames=[];
 for(let i=0;i<8;i++){mole.x=100+i*9;a.update(16);frames.push(mole.frame)}
 assert.equal(new Set(frames).size,4);assert.equal(mole.width,before.width);assert.equal(mole.height,before.height);
 assert.equal(mole.scaleX,before.scaleX);assert.equal(mole.scaleY,before.scaleY);assert.equal(mole.flipX,before.flipX);
 assert.deepEqual(mole.body,before.body);
});
test('emerging, digging, windup and strike each use the matching sequence',()=>{
 const {s,mole,a}=fixture();mole.setData('emerging',true);assert.equal(ctx.moleMotion(mole,1000),'dig');
 const seen=new Set();for(let i=0;i<4;i++)seen.add(ctx.enemyFrame('dig',i*100));assert.equal(seen.size,4);
 mole.setData('emerging',false);for(const [texture,state]of [['digging','dig'],['charging','windup'],['attacking','strike']]){
  mole.setTexture('desert-mole-'+texture);assert.equal(ctx.moleMotion(mole,1000),state);
 }
 assert.equal(ctx.enemyFrame('windup',0,0,{duration:200}),0);assert.equal(ctx.enemyFrame('windup',170,0,{duration:200}),1);
 assert.equal(ctx.enemyFrame('strike',0,0,{mole:true,duration:180}),0);assert.equal(ctx.enemyFrame('strike',170,0,{mole:true,duration:180}),1);
});
test('a falling underground mole braces instead of taking walking steps in mid-air',()=>{
 const {s,mole,a}=fixture();s.moleAIs=new Map([[mole,{mode:'falling'}]]);const frames=[];
 for(let i=0;i<6;i++){mole.y+=9;a.update(16);frames.push(mole.frame)}
 assert.equal(a.actors.get(mole).state,'fall');assert.deepEqual(frames,Array(6).fill('motion-1'));
});
for(const flag of ['isPaused','inventoryOpen','isInteractingWithLever'])test(flag+' freezes enemy frames and resumes without jumping ahead',()=>{
 const {s,mole,a}=fixture();a.update(16);const r=a.actors.get(mole),elapsed=r.elapsed,frame=mole.frame;
 s[flag]=true;for(let i=0;i<100;i++)a.update(50);assert.equal(r.elapsed,elapsed);assert.equal(mole.frame,frame);
 s[flag]=false;a.update(16);assert.equal(r.elapsed,elapsed+16);
});
test('stun, hidden monkeys and dead actors are never overwritten by movement animation',()=>{
 const {s,mole,m,a}=fixture();mole.setData('stunnedUntil',2000);mole.frame='hurt';m.hidden=true;m.sprite.frame='hidden';a.update(16);
 assert.equal(mole.frame,'hurt');assert.equal(m.sprite.frame,'hidden');m.hidden=false;m.stunnedUntil=2000;a.update(16);assert.equal(m.sprite.frame,'hidden');
 mole.setData('stunnedUntil',0);mole.active=false;a.update(16);assert.equal(mole.frame,'hurt');
});
test('all monkey colors and the king retain their own identity while climbing and throwing',()=>{
 for(const kind of ['brown','red','blue','king'])for(const [phase,expected]of [['approach','walk'],['vertical','climb'],['depart','walk']]){
  const {m,a}=fixture();m.kind=kind==='king'?'brown':kind;m.isBoss=kind==='king';m.climbing=true;m.climbRoute={phase};
  assert.equal(ctx.monkeyMotion(m),expected);a.update(16);
  assert.equal(m.sprite.texture.key,'monkey-'+kind+(expected==='climb'?'-climbing':''));
  m.attackPhase='windup';a.update(16);assert.equal(m.sprite.texture.key,'monkey-'+kind+'-throwing');
  m.attackPhase='release';a.update(16);assert.equal(m.sprite.frame,'motion-2');
 }
});
test('throw animation preserves the locked aim and holds special ammunition in the painted hand',()=>{
 const {m,a}=fixture();m.attackPhase='windup';m.throwKind='blue';m.throwTarget={x:45,y:200};m.throwDirection=-1;
 m.throwPreview={setVisible(v){this.visible=v},setPosition(x,y){this.x=x;this.y=y},setDisplaySize(w,h){this.width=w;this.height=h}};
 const target={...m.throwTarget};a.update(16);const first={x:m.throwPreview.x,y:m.throwPreview.y};
 for(let i=0;i<30;i++)a.update(16);assert.deepEqual(m.throwTarget,target);assert.equal(m.throwDirection,-1);
 assert.ok(m.throwPreview.visible);assert.ok(m.throwPreview.y<first.y,'coconut goes back above the shoulder');
 assert.ok(Number.isFinite(m.throwPreview.x)&&m.throwPreview.width>10);
});
test('the actual red and blue artwork keeps warm faces and paws, without the old blotchy recoloring',()=>{
 const tan=([r,g,b,a])=>a>128&&r>g&&g>b&&g/r>.5&&g/r<.95;
 for(const kind of ['red','blue']){
  const image=readRgba(path.join(root,'assets/common/enemies/monkey-'+kind+'-motion-v1.png'));
  const pixel=(x,y)=>[...image.pixels.subarray((y*image.width+x)*4,(y*image.width+x)*4+4)];
  for(const [x,y]of [[120,135],[192,111],[226,224],[60,197]])assert.ok(tan(pixel(x,y)),kind+' skin stays tan at '+x+','+y);
  const [r,g,b]=pixel(132,40);assert.ok(kind==='blue'?b>r*2:r>g*2,'fur has its own color');
  const [R,G,B]=pixel(146,179);assert.ok(G>R&&G>B,'coconut badge keeps its green leaf');
 }
 assert.equal(tan([58,149,255,253]),false,'reject the previous blue face/paw patches');
 assert.equal(tan([240,31,19,253]),false,'reject a uniform red tint over the skin');
});

// Inspect the real alpha silhouettes, not nominal transparent cell dimensions.
for(const name of ['mole','monkey','monkey-red','monkey-blue','king'])test(name+': all source frames contain one full, grounded figure with broad limbs',()=>{
 const image=readRgba(path.join(root,'assets/common/enemies/'+name+'-motion-v1.png'));
 const labels=ctx.labelEnemyPixels(image.pixels,image.width,image.height),areas=[],widths=[];
 for(const f of (specs[name]||specs.monkey).frames){
  const [x,y,w,h]=f.rect;assert.ok(x>=0&&y>=0&&x+w<=image.width&&y+h<=image.height);
  const pixels=ctx.isolateEnemyCell(image.pixels,labels,image.width,image.height,f.rect);
  let area=0,minX=w,maxX=0,minY=h,maxY=0;
  for(let py=0;py<h;py++)for(let px=0;px<w;px++)if(pixels[(py*w+px)*4+3]>=128){area++;minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py)}
  assert.ok(area>25000,'a full opaque character, rather than a small ghost from an adjacent cell');
  assert.ok(Math.abs(f.root[1]-(y+maxY))<=4,'feet stay on their registered baseline');
  areas.push(area);widths.push(maxX-minX);
 }
 assert.ok(Math.max(...areas)/Math.min(...areas)<1.65,'body volume remains stable while limbs articulate');
});

function inkWidth(image,x,y,nx,ny){const length=Math.hypot(nx,ny);nx/=length;ny/=length;
 const alpha=d=>{const X=Math.round(x+nx*d),Y=Math.round(y+ny*d);return X>=0&&X<image.width&&Y>=0&&Y<image.height?image.pixels[(Y*image.width+X)*4+3]:0};
 assert.ok(alpha(0)>128,'sample is inside the actual painted limb');let a=0,b=0;while(a>-90&&alpha(a-1)>128)a--;while(b<90&&alpha(b+1)>128)b++;return b-a+1;}
test('visible king forearm and monkey leg preserve the sturdy original proportions',()=>{
 const original=readRgba(path.join(root,'assets/jungle/jungle-monkeys.png'));
 const monkey=readRgba(path.join(root,'assets/common/enemies/monkey-motion-v1.png'));
 const king=readRgba(path.join(root,'assets/common/enemies/king-motion-v1.png'));
 // Independent normal cross-sections through exposed limbs in the artwork.
 const originalLeg=inkWidth(original,303,391,1,0)*(140/471);
 const newLeg=inkWidth(monkey,220,265,1,0)*specs.monkey.unit;
 assert.ok(newLeg>=originalLeg*.85&&newLeg<=originalLeg*1.3,'do not thin the walking leg');
 const arm=inkWidth(king,313,245,1,0)*specs.king.unit;assert.ok(arm>=20&&arm<=30,'king forearm remains solid and broad');
 assert.ok(newLeg*.65<originalLeg*.85,'a deliberately thinned old-style limb is rejected');
});
