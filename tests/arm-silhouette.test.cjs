const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {readRgba}=require('./helpers/png-rgba.cjs'),root=path.join(__dirname,'..');
const ctx=vm.createContext({});
for(const [file,name]of [['weapons'],['hammerRules'],['SwordAnimation','SwordAnimation'],['MeleeAnimation','MeleeAnimation']]){
 let code=fs.readFileSync(path.join(root,'src/utils',file+'.js'),'utf8').replace(/^import .*;\n/gm,'');
 if(name)code=code.replace(/export default class \w+/,'globalThis.'+name+'=class '+name);
 vm.runInContext(code.replace(/export /g,''),ctx);
}
const source=readRgba(path.join(root,'assets/common/characters/melee/attack-parts-v2.png'));
const cuts=vm.runInContext('PART_CUTS',ctx),parts={};
for(const name of ['upper','forearm','hand']){
 const cut=cuts[name],[x,y,w,h]=cut.rect,pixels=Buffer.alloc(w*h*4);
 for(let row=0;row<h;row++)source.pixels.copy(pixels,row*w*4,((y+row)*source.width+x)*4,((y+row)*source.width+x+w)*4);
 const pivot={x:cut.pivot[0]-x,y:cut.pivot[1]-y},end={x:cut.end[0]-x,y:cut.end[1]-y};
 parts[name]={key:name,width:w,height:h,pixels,pivot,end,originX:pivot.x/w,originY:pivot.y/h,
  length:Math.hypot(end.x-pivot.x,end.y-pivot.y),angle:0,wristRatio:cut.wristRatio,
  thickness:ctx.measureLimbThickness(pixels,w,h,pivot,end)};
}
const gripAtlas=readRgba(path.join(root,'assets/common/characters/hammer-motion/grip-hands-v2.png'));
const gripCuts=JSON.parse(fs.readFileSync(path.join(root,'assets/common/characters/hammer-motion/grips-v2.json')));
for(const [id,cut]of Object.entries(gripCuts)){
 const [x,y,width,height]=cut.rect,pixels=Buffer.alloc(width*height*4);
 for(let row=0;row<height;row++)gripAtlas.pixels.copy(pixels,row*width*4,((y+row)*gripAtlas.width+x)*4,((y+row)*gripAtlas.width+x+width)*4);
 const pivot={x:cut.grip[0]-x,y:cut.grip[1]-y},wrist={x:cut.wrist[0]-x,y:cut.wrist[1]-y};
 parts['hammerHand'+id[0].toUpperCase()+id.slice(1)]={key:'grip-'+id,...ctx.hammerGripGeometry(cut),
  width,height,pixels,pivot,sampleStart:wrist,sampleEnd:pivot,
  axisTop:{x:cut.axisTop[0]-x,y:cut.axisTop[1]-y},
  thickness:ctx.measureLimbThickness(pixels,width,height,wrist,pivot)};
}
const part={key:'weapon',length:474,height:345,angle:0,originX:.8,originY:.5,
 outline:[{x:0,y:-.35},{x:1,y:-.35},{x:1,y:.32},{x:0,y:.32}]};
parts.sword=parts.powerHammer=part;
const motionCuts=JSON.parse(fs.readFileSync(path.join(root,'assets/common/characters/level-motion/frames.json'))).poses;
const restFrames=motionCuts.map(cut=>{
 const hand=p=>({x:(cut.root[0]-p[0])*.548,y:-3+(p[1]-cut.root[1])*.548});
 return {hand:hand(cut.hand),otherHand:hand(cut.otherHand||cut.hand)};
});
const frames=Array.from({length:13},(_,i)=>({key:'body-'+i,shoulder:{x:-18+i*.4,y:-65+i*.7}}));
const image=()=>({active:true,scene:{},visible:true,alpha:1,depth:1,x:200,y:300,scaleY:.6,texture:{key:'idle'},
 getData:()=> 'idle',setTexture(k){this.texture={key:k};return this},setOrigin(x,y){this.originX=x;this.originY=y;return this},
 setVisible(v){this.visible=v;return this},setAlpha(v){this.alpha=v;return this},setDepth(v){this.depth=v;return this},
 setPosition(x,y){this.x=x;this.y=y;return this},setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this},
 setFlipX(v){this.flipX=v;return this},setRotation(v){this.rotation=v;return this}});
function fixture(weapon,direction,ducking,scale=.6){
 const crouchFrames=frames.map(f=>({...f,shoulder:{x:f.shoulder.x,y:f.shoulder.y+25}}));
 const bodies={'male-stand':frames,'male-crouch':crouchFrames,'male-hammer-right-stand':frames,'male-hammer-right-crouch':crouchFrames,
  'male-left-far-stand':frames,'male-left-far-crouch':crouchFrames};
 const assets={bodies,parts},p=image();p.scaleY=scale;
 const scene={registry:{get:k=>k==='saveData'?{}:k==='level-motion-assets'?{poses:restFrames}:assets},add:{image},worldTime:0,player:p,
  equipped:{weapon},facingX:direction,isDucking:ducking,isSwinging:true,swingStartedAt:0,
  getMeleeBounds:()=>({x:direction>0?200:140,y:ducking?262:224,width:60,height:ducking?38:76})};
 return {scene,animation:new ctx.MeleeAnimation(scene)};
}
// Measure the opaque PNG after the production image transform. Sampling in
// world coordinates catches flattened sleeves, padding, rotation and mirroring.
function visibleWidth(draw,part,t){
 const cos=Math.cos(draw.rotation),sin=Math.sin(draw.rotation),sx=draw.scaleX,sy=draw.scaleY;
 const start=part.sampleStart||part.pivot,end=part.sampleEnd||part.end;
 const local={x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t};
 const u=(local.x-draw.originX*part.width)*sx,v=(local.y-draw.originY*part.height)*sy;
 const cx=draw.x+u*cos-v*sin,cy=draw.y+u*sin+v*cos;
 const dx=(end.x-start.x)*sx,dy=(end.y-start.y)*sy,L=Math.hypot(dx,dy);
 const nx=(-dy*cos-dx*sin)/L,ny=(-dy*sin+dx*cos)/L;
 let first=Infinity,last=-Infinity;
 for(let d=-40;d<=40;d+=.125){
  const X=cx+nx*d-draw.x,Y=cy+ny*d-draw.y;
  const x=Math.round((X*cos+Y*sin)/sx+draw.originX*part.width),y=Math.round((-X*sin+Y*cos)/sy+draw.originY*part.height);
  if(x>=0&&x<part.width&&y>=0&&y<part.height&&part.pixels[(y*part.width+x)*4+3]>=128){first=Math.min(first,d);last=Math.max(last,d);}
 }
 return last-first+.125;
}
test('alpha calibration measures sleeve ink instead of the padded canvas or wide joint cap',()=>{
 assert.ok(parts.upper.thickness<parts.upper.height*.7);
 assert.ok(parts.forearm.thickness<parts.forearm.height*.85);
 assert.ok(parts.hand.thickness<parts.hand.height);
});
for(const weapon of ['sword','powerHammer'])for(const direction of [-1,1])for(const ducking of [false,true]){
 test(weapon+' '+direction+' '+(ducking?'crouched':'standing')+': actual painted sleeves and glove stay broad through the full attack',()=>{
  for(const scale of [.6,1.2]){
   const {scene,animation:a}=fixture(weapon,direction,ducking,scale),unit=scale/.6;
   for(const elapsed of [0,40,80,110,140,210,260,319]){
    scene.worldTime=elapsed;a.update();
    for(const [name,min,max]of [['upper',9.9,15],['forearm',9.1,14],['hand',8.5,13]]){
     if(name!=='hand'&&!a[name].visible)continue;
     const cut=name==='hand'?(a.lastPose.handPart||parts.hand):parts[name];
     const widths=[.4,.5,.6,.7].map(t=>visibleWidth(a[name],cut,t)/unit).sort((a,b)=>a-b);
     assert.ok(widths[0]>=min-.3,name+' is visibly too thin: '+widths.join(', '));
     assert.ok(widths[2]<=max,name+' becomes disproportionately wide: '+widths.join(', '));
    }
   }
  }
 });
}
test('the old height-based rendering really fails this visible-width regression',()=>{
 const {scene,animation:a}=fixture('powerHammer',1,false);scene.worldTime=150;a.update();
 a.upper.scaleY=12/parts.upper.height;a.forearm.scaleY=10/parts.forearm.height;
 assert.ok(visibleWidth(a.upper,parts.upper,.6)<9,'detect the previously approved thin upper arm');
 assert.ok(visibleWidth(a.forearm,parts.forearm,.6)<9,'detect the previously approved thin forearm');
});

// Independent source-pixel-to-world transform of the actual cropped artwork.
// This catches a hand that looks like a fist with a shaft through the knuckles,
// even if the nominal weapon pivot and hitbox still agree mathematically.
function sourcePoint(draw,part,point){
 const x=(point.x-draw.originX*part.width)*draw.scaleX,y=(point.y-draw.originY*part.height)*draw.scaleY;
 return {x:draw.x+x*Math.cos(draw.rotation)-y*Math.sin(draw.rotation),
  y:draw.y+x*Math.sin(draw.rotation)+y*Math.cos(draw.rotation)};
}
function assertGrip(a,direction){
 const p=a.lastPose,part=p.handPart,cuff=sourcePoint(a.hand,part,part.sampleStart);
 const grip=sourcePoint(a.hand,part,part.pivot),axis=sourcePoint(a.hand,part,part.axisTop);
 assert.ok(Math.hypot(cuff.x-(p.x+direction*p.wrist.x),cuff.y-(p.feetY+p.wrist.y))<1e-7,'forearm ends exactly inside painted cuff');
 assert.ok(Math.hypot(grip.x-a.weapon.x,grip.y-a.weapon.y)<1e-7,'palm and wooden shaft have the same grip point');
 const dx=axis.x-grip.x,dy=axis.y-grip.y,L=Math.hypot(dx,dy);
 assert.ok((dx*direction*Math.cos(p.angle)+dy*Math.sin(p.angle))/L>.999999,'painted shaft points toward real hammer head');
 assert.ok(Math.abs(dx*Math.sin(p.angle)-dy*direction*Math.cos(p.angle))<1e-7,'the two shafts are collinear');
 assert.ok([.4,.5,.6,.7].every(t=>visibleWidth(a.hand,part,t)>=8.2),'new grip remains as chunky as approved fist');
}
test('painted hammer grip axis and cuff stay attached in every phase, orientation and charged attack',()=>{
 for(const trainer of [false,true])for(const direction of [-1,1])for(const ducking of [false,true]){
  const {scene,animation:a}=fixture('powerHammer',direction,ducking);
  if(trainer)a.parts={...parts,hammerHandNear:parts.hammerHandTrainerNear,hammerHandFar:parts.hammerHandTrainerFar};
  for(const hold of [0,400,1050,1750]){
   scene.hammerAttack=hold?ctx.hammerAttackForHold(hold):null;
   for(const elapsed of [0,40,80,110,150,210,260,319]){
    a.state=null;scene.swingStartedAt=0;scene.worldTime=elapsed;scene.hammerCharge=null;a.update();
    assertGrip(a,direction);

   }
  }
 }
});
test('the production hammer pivot is on brown wood, away from the gold pommel',()=>{
 const atlas=readRgba(path.join(root,'assets/common/characters/melee/attack-parts.png'));
 const [x,y]=cuts.powerHammer.pivot,offset=(y*atlas.width+x)*4,[r,g,b,a]=atlas.pixels.subarray(offset,offset+4);
 assert.ok(a>=128&&r>g&&g>b&&g<135,'grip is on the brown wooden shaft, not the bright gold pommel');
 assert.ok(x>=380&&x<=465,'the palm sits on the lower shaft');
});

test('the real grip also stays aligned while charging, falling, landing and recovering',()=>{
 for(const direction of [-1,1])for(const ducking of [false,true]){
  for(const kind of ['charge','slam','landing','recovery']){
   const {scene,animation:a}=fixture('powerHammer',direction,ducking);
   if(kind==='recovery'){
    scene.worldTime=319;a.update();scene.isSwinging=false;a.update();
    for(const elapsed of [1,30,60,89]){scene.worldTime=319+elapsed;a.update();assertGrip(a,direction);}
   }else for(const elapsed of kind==='charge'?[0,400,1050,1750]:[0,20,70,150]){
    a.state=null;scene.worldTime=elapsed;
    scene.hammerCharge=kind==='charge'?{holding:true,ready:true,elapsed,sequence:1}:null;
    scene.hammerSlamActive=kind==='slam';scene.swingVisualKind=kind==='landing'?'landing':'swing';
    a.update();assertGrip(a,direction);
   }
  }
 }
});

test('real compact glove does not kink the wrist backwards during the low thrust',()=>{
 for(const direction of [-1,1]){
  const {scene,animation:a}=fixture('powerHammer',direction,true);
  for(const t of [110,140,180,210,260,319]){
   scene.worldTime=t;a.update();const p=a.lastPose;
   const f={x:p.wrist.x-p.elbow.x,y:p.wrist.y-p.elbow.y},h={x:p.hand.x-p.wrist.x,y:p.hand.y-p.wrist.y};
   const bend=Math.abs(Math.atan2(f.x*h.y-f.y*h.x,f.x*h.x+f.y*h.y));
   assert.ok(bend<=Math.PI*70/180,'painted cuff-to-palm axis stays within the allowed wrist bend: '+bend*180/Math.PI);
  }
 }
});

test('carrying and recovery use a foreshortened forearm instead of a reversed wrist',()=>{
 for(const direction of [-1,1]){
  const {scene,animation:a}=fixture('powerHammer',direction,false);
  scene.worldTime=0;a.update();
  const check=()=>{
   const p=a.lastPose,f={x:p.wrist.x-p.elbow.x,y:p.wrist.y-p.elbow.y},h={x:p.hand.x-p.wrist.x,y:p.hand.y-p.wrist.y};
   assert.ok(Math.abs(Math.atan2(f.x*h.y-f.y*h.x,f.x*h.x+f.y*h.y))<=Math.PI*70/180+1e-6,'painted wrist stays connected naturally through the return');
  };
  check();scene.worldTime=319;a.update();scene.isSwinging=false;a.update();
  for(const t of [1,15,30,45,60,75,89]){scene.worldTime=319+t;a.update();check();}
 }
});
