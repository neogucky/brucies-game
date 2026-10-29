const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx={Promise,Map,Set,globalThis:null,Phaser:{Scene:class{}},performance:{now:()=>1}};
ctx.globalThis=ctx;vm.createContext(ctx);
function load(file,name){let code=fs.readFileSync(path.join(root,file),'utf8').replace(/^import[\s\S]*?;\n/gm,'');if(name)code=code.replace(/export default class \w+/,`globalThis.${name}=class ${name}`);vm.runInContext(code.replace(/export /g,''),ctx)}
ctx.bookIntroMusicMix=vm.runInNewContext(fs.readFileSync(path.join(root,'src/utils/bookTimeline.js'),'utf8').replace(/export /g,'')+'\nbookIntroMusicMix;');load('src/utils/introTimeline.js');load('src/utils/BookShots.js','BookShots');load('src/utils/IntroAudio.js','IntroAudio');load('src/utils/storyPreview.js');load('src/scenes/IntroScene.js','IntroScene');load('src/utils/controlProfiles.js');load('src/utils/PortableControls.js','PortableControls');

test('the story follows sleep, shadow, window, treasure dragon, bouncing, yawn and ready beats',()=>{
 for(const [time,beat] of [[0,'sleep'],[2700,'shadow'],[5200,'window'],[8500,'dragon'],[13700,'return'],[16300,'wake'],[18900,'yawn'],[22000,'ready']])assert.equal(ctx.getIntroFrame(time).beat,beat);
 assert.equal(ctx.getIntroFrame(0).helper.pose,'sleep');assert.equal(ctx.getIntroFrame(16300).occupant.pose,'sleep');assert.equal(ctx.getIntroFrame(18900).occupant.pose,'yawn');assert.equal(ctx.getIntroFrame(22000).occupant.visible,false);assert.equal(ctx.getIntroFrame(22000).knight.visible,true);
 assert.equal(ctx.getIntroFrame(19800).occupant.pose,'awake');
});
test('both requested credit lines appear in order, one at a time, and remain readable for several seconds',()=>{
 assert.equal(ctx.getIntroFrame(2000).credit,'Spielidee von Brucy');assert.equal(ctx.getIntroFrame(8300).credit,'Entwickelt mit Onkel Tim');
 assert.equal(ctx.getIntroFrame(2000).creditAlpha,1);assert.equal(ctx.getIntroFrame(8300).creditAlpha,1);assert.equal(ctx.getIntroFrame(4000).credit,'');
});
test('scene cuts occur under black and the dragon crosses above the castle from left to right',()=>{
 assert.equal(ctx.getIntroFrame(6200).transition,1);assert.equal(ctx.getIntroFrame(12800).transition,1);
 assert.equal(ctx.getIntroFrame(8500).stage,'exterior');assert.equal(ctx.getIntroFrame(13300).stage,'bedroom');
 assert.ok(ctx.getIntroFrame(7300).dragon.x<ctx.getIntroFrame(11300).dragon.x);
 assert.ok(ctx.getIntroFrame(8300).dragon.y<350);
});
test('helper actually reaches the windowsill, bounces on the covered torso, and ends beside the ready knight',()=>{
 const sill=ctx.getIntroFrame(5800);assert.equal(sill.helper.x,764);assert.equal(sill.helper.y,370);assert.equal(sill.helper.pose,'peek');
 const bounce=ctx.getIntroFrame(15800);assert.equal(bounce.helper.x,306);assert.equal(bounce.helper.groundY,354);assert.ok(bounce.helper.y<354);
 const end=ctx.getIntroFrame(25000);assert.equal(end.helper.x,695);assert.equal(end.knight.x,565);assert.equal(end.helper.y,end.knight.y);
});
test('reduced motion keeps the whole story but reduces jump height',()=>{
 const normal=ctx.getIntroFrame(15800),reduced=ctx.getIntroFrame(15800,true);assert.equal(normal.beat,reduced.beat);assert.ok(reduced.helper.y>normal.helper.y);
});
test('intro clock clamps invalid/end times and only completes after the ending title',()=>{
 assert.equal(ctx.getIntroFrame(-30).time,0);assert.equal(ctx.getIntroFrame(NaN).time,0);assert.equal(ctx.getIntroFrame(27000).done,false);assert.equal(ctx.getIntroFrame(27800).done,true);assert.equal(ctx.getIntroFrame(99999).time,27800);
});
test('audio cues cannot be replayed or skipped at a normal frame boundary',()=>{
 assert.equal(ctx.introCuesBetween(1990,2010)[0][1],'whoosh');assert.equal(ctx.introCuesBetween(2000,2010).length,0);
 const cues=[];for(let t=0;t<27800;t+=17)cues.push(...ctx.introCuesBetween(t,Math.min(27800,t+17)));
 assert.equal(cues.length,18);assert.equal(new Set(cues.map(c=>c[0])).size,cues.length);
});
test('intro always returns to the main menu, including developer world URLs',()=>{
 for(const key of ['MainMenuScene','DessertMapScene','UndergroundMapScene','JungleMapScene',undefined])assert.equal(ctx.introReturnScene(key),'MainMenuScene');
});
test('skip is safe before playback, during playback and after completion, and never writes a save',()=>{
 for(const started of [false,true]){let destinations=[],stops=0;const s=Object.create(ctx.IntroScene.prototype);Object.assign(s,{started,returnScene:'JungleMapScene',audio:{destroy(){stops++}},scene:{start(key){destinations.push(key)}},registry:{set(){throw new Error('must not alter save')}}});s.finish();s.finish();assert.deepEqual(destinations,['MainMenuScene']);assert.equal(stops,1)}
});
test('tab switching freezes the story and returning resumes without a start panel',()=>{
 let paused=0,resumed=0;const panel={setVisible(){}},text={setText(){return this},setFontSize(){return this}};
 const s=Object.create(ctx.IntroScene.prototype);Object.assign(s,{started:true,elapsed:11900,returnScene:'MainMenuScene',audio:{pause(){paused++},resume(){resumed++}},startPanel:panel,startTitle:text,startButton:text});
 s.suspendIntro();s.update(0,5000);assert.equal(s.elapsed,11900);assert.equal(paused,1);s.startIntro();assert.equal(s.suspended,false);assert.equal(resumed,1);
});
test('credits use real elapsed time rather than an accelerated game-loop delta',()=>{
 const original=ctx.performance.now;let now=1000;ctx.performance.now=()=>now;
 try{
  const s=Object.create(ctx.IntroScene.prototype);Object.assign(s,{started:true,elapsed:0,lastFrameAt:1000,audio:{play(){},setMusicVolume(){},setTime(){}},drawFrame(){}});
  now=1050;s.update(0,5000);assert.equal(s.elapsed,50);now=1070;s.update(0,5000);assert.equal(s.elapsed,70);
 }finally{ctx.performance.now=original}
});
for(const profile of ['ipadKeyboard','pc','ipadTouch'])test(profile+': Space and Enter skip once; unrelated keys never restart the intro',()=>{
 for(const code of ['Space','Enter']){
  let starts=0,skips=0;const s={isIntro:true,startIntro(){starts++},finish(){skips++}};
  const c=Object.create(ctx.PortableControls.prototype);c.activeScene=()=>s;c.getProfile=()=>profile;c.held=new Set();
  for(const key of ['KeyE','KeyQ','Escape'])c.onKey({code:key,preventDefault(){},stopImmediatePropagation(){}},true);
  c.dispatch('back');assert.equal(starts+skips,0);
  c.onKey({code,preventDefault(){},stopImmediatePropagation(){}},true);
  c.onKey({code,repeat:true,preventDefault(){},stopImmediatePropagation(){}},true);
  c.onKey({code,repeat:false,preventDefault(){},stopImmediatePropagation(){}},true);
  c.onKey({code,preventDefault(){},stopImmediatePropagation(){}},false);
  assert.equal(starts,0);assert.equal(skips,1);
 }
 assert.equal(ctx.introSkipLabel(profile),profile==='ipadTouch'?'Überspringen':'Überspringen · Leertaste');
});

for(const code of ['Space','Enter'])test(code+': a held skip key is consumed across the menu transition until release',()=>{
 const {EventEmitter}=require('node:events'), keyboard=new EventEmitter();let active,skips=0,menuActions=0;
 const menu={input:{keyboard}};keyboard.on('keydown-'+(code==='Space'?'SPACE':'ENTER'),()=>menuActions++);
 const intro={isIntro:true,finish(){skips++;active=menu}};active=intro;
 const c=Object.create(ctx.PortableControls.prototype);c.activeScene=()=>active;c.getProfile=()=>'ipadKeyboard';c.held=new Set();c.heldKeys=new Map();
 const event=(repeat=false)=>({code,repeat,preventDefault(){},stopImmediatePropagation(){}});
 c.onKey(event(),true);assert.equal(skips,1);assert.equal(active,menu);
 // Scene housekeeping releases movement, but must retain the skip-key latch.
 c.clearHeld();c.onKey(event(true),true);c.onKey(event(false),true);assert.equal(menuActions,0);
 c.onKey(event(),false);c.onKey(event(),true);assert.equal(menuActions,1);assert.equal(skips,1);
});

test('the Enter used to open a replay cannot also skip that replay while held',()=>{
 const {EventEmitter}=require('node:events'),keyboard=new EventEmitter();let active,starts=0,skips=0;
 const intro={isIntro:true,finish(){skips++}},menu={input:{keyboard}};active=menu;
 keyboard.on('keydown-ENTER',()=>{starts++;active=intro});
 const c=Object.create(ctx.PortableControls.prototype);c.activeScene=()=>active;c.getProfile=()=>'ipadKeyboard';
 const event={code:'Enter',preventDefault(){},stopImmediatePropagation(){}};
 c.onKey(event,true);assert.equal(starts,1);c.onKey(event,true);assert.equal(skips,0);
 c.onKey(event,false);c.onKey(event,true);assert.equal(skips,1);
});

test('losing focus releases pressed keys even when the browser never sends their keyup',()=>{
 const c=Object.create(ctx.PortableControls.prototype);c.pressedKeys=new Set(['Enter']);c.activeScene=()=>({});
 c.autoPause();assert.equal(c.pressedKeys.size,0);
});

function introFocusFixture(lateCanvas=false){
 const previous={document:ctx.document,window:ctx.window};
 const windowListeners={},documentListeners={};let focuses=0,skips=0,resumes=0,active;
 const doc={activeElement:{tagName:'BUTTON',id:'game-button'},getElementById(){return null},
  addEventListener(type,fn){documentListeners[type]=fn},removeEventListener(){}};
 const win={addEventListener(type,fn){windowListeners[type]=fn},removeEventListener(){}};
 ctx.document=doc;ctx.window=win;
 const canvas={tagName:'CANVAS',addEventListener(){},removeEventListener(){},
  focus(options){focuses++;doc.activeElement=this;assert.equal(options.preventScroll,true)}};
 const menu={sys:{settings:{key:'MainMenuScene'}}};
 const intro={isIntro:true,started:true,sys:{settings:{key:'IntroScene'}},
  finish(){skips++;active=menu},suspendIntro(){this.suspended=true},startIntro(){this.suspended=false;resumes++}};
 active=intro;
 const game={canvas:lateCanvas?null:canvas,scene:{getScenes(){return [active]}}};
 const controls=new ctx.PortableControls(game);
 return {controls,game,canvas,intro,menu,doc,windowListeners,documentListeners,
  focuses:()=>focuses,skips:()=>skips,resumes:()=>resumes,
  restore(){controls.destroy();ctx.document=previous.document;ctx.window=previous.window}};
}

test('autoplay moves DOM focus from a game button to the canvas',()=>{
 const f=introFocusFixture();
 try{
  assert.equal(f.doc.activeElement.id,'game-button');f.controls.update();
  assert.equal(f.doc.activeElement,f.canvas);assert.equal(f.focuses(),1);
  const event={code:'Space',target:f.doc.activeElement,preventDefault(){this.prevented=true},stopImmediatePropagation(){}};
  f.windowListeners.keydown(event);assert.equal(f.skips(),1);assert.equal(event.prevented,true);
  f.controls.update();assert.equal(f.doc.activeElement,f.canvas);
  // Scene changes still retain the held-key latch from the original skip fix.
  assert.ok(f.controls.pressedKeys.has('Space'));
  f.windowListeners.keyup(event);assert.equal(f.controls.pressedKeys.has('Space'),false);
 }finally{f.restore()}
});

test('a canvas attached after the cinematic starts still receives startup keyboard focus',()=>{
 const f=introFocusFixture(true);
 try{
  f.controls.update();assert.equal(f.focuses(),0);
  f.game.canvas=f.canvas;f.controls.update();assert.equal(f.focuses(),1);assert.equal(f.doc.activeElement,f.canvas);
  f.controls.update();assert.equal(f.focuses(),1,'normal animation frames do not steal focus repeatedly');
 }finally{f.restore()}
});

test('returning to an autoplaying cinematic restores both game focus and playback',()=>{
 const f=introFocusFixture();
 try{
  f.controls.update();f.windowListeners.blur();assert.equal(f.intro.suspended,true);
  f.doc.activeElement={tagName:'BUTTON',id:'game-button'};
  f.windowListeners.focus();assert.equal(f.doc.activeElement,f.canvas);assert.equal(f.resumes(),1);
  assert.equal(f.intro.suspended,false);
 }finally{f.restore()}
});

function audioFixture(options){
 let instances=0;const voices=[];
 class Context{
  constructor(){instances++;this.state='suspended';this.destination={}}
  createGain(){return {gain:{value:1},connect(){}}}
  decodeAudioData(){return Promise.resolve({duration:1})}
  createBufferSource(){const voice={connect(){},disconnect(){},start(){this.playing=true},stop(){this.playing=false}};voices.push(voice);return voice}
  resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}close(){this.state='closed';return Promise.resolve()}
 }
 const audio=new ctx.IntroAudio(Context,()=>Promise.resolve({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(1))}),options);return {audio,voices,instances:()=>instances};
}
test('automatic audio start and pause/resume keep the same context and music voice',async()=>{
 const {audio,voices,instances}=audioFixture();await audio.ready;await audio.start();audio.play('whoosh');assert.equal(instances(),1);assert.equal(voices.length,2);
 audio.pause();assert.equal(audio.context.state,'suspended');await audio.resume();assert.equal(audio.context.state,'running');assert.equal(voices.length,2);
 audio.mute(true);assert.equal(audio.master.gain.value,0);audio.mute(false);assert.equal(audio.master.gain.value,1);audio.destroy();
});
test('leaving disposes every voice and context; late loading cannot restart the intro music',async()=>{
 const {audio,voices}=audioFixture();audio.start();audio.destroy();await audio.ready;await Promise.resolve();assert.equal(voices.length,0);assert.equal(audio.context.state,'closed');assert.equal(audio.buffers.size,0);assert.doesNotThrow(()=>audio.destroy());
 const b=audioFixture();await b.audio.ready;await b.audio.start();b.audio.play('boing');b.audio.destroy();assert.ok(b.voices.every(v=>!v.playing));
});
test('missing audio remains silent without blocking Start, Skip or cleanup',async()=>{
 const a=new ctx.IntroAudio(undefined,undefined);await a.ready;assert.doesNotThrow(()=>{a.start();a.pause();a.resume();a.mute(true);a.destroy()});
});
test('every generated audio file is valid, audible PCM with safe peak headroom',()=>{
 for(const name of ['music','snore','whoosh','hop','boing','yawn','chime','paper','splash','hero-leap','reveal']){
  const wav=fs.readFileSync(path.join(root,'assets/intro/sounds',name+'.wav'));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');assert.equal(wav.readUInt32LE(24),22050);let peak=0;for(let i=44;i<wav.length;i+=2)peak=Math.max(peak,Math.abs(wav.readInt16LE(i)));assert.ok(peak>1000&&peak<30000,name);
 }
});

test('every 60-Hz frame keeps the dragon outside and above the helper, with shadow projection restricted to the floor',()=>{
 const floor=vm.runInContext('INTRO_FLOOR_LIGHT',ctx);
 assert.ok(floor.every(p=>p.y>=440&&p.y<=600));
 let outsideFrames=0,shadowFrames=0;
 for(let n=0;n<=1668;n++){
  const f=ctx.getIntroFrame(n*1000/60);
  if(f.shadow.alpha>0){shadowFrames++;assert.ok(f.shadow.height<f.shadow.width/3);assert.ok(f.shadow.y>450);}
  if(f.stage==='exterior'){
   outsideFrames++;assert.equal(f.helper.x,112);assert.equal(f.helper.groundY,494);
   assert.ok(f.dragon.y+f.dragon.height/2 < f.helper.y-92,'dragon never reaches the nearby sill/helper');
  }
 }
 assert.ok(outsideFrames>390);assert.ok(shadowFrames>100);
});

function bookShotFixture(){
 const calls=[],paths=[],stack=[];let clip=null,current=[];
 const c={save(){stack.push(clip)},restore(){clip=stack.pop()},translate(){},rotate(){},scale(){},
   beginPath(){current=[]},moveTo(x,y){current.push({x,y})},lineTo(x,y){current.push({x,y})},closePath(){},
   clip(){clip=current.slice();paths.push(clip)},ellipse(){},fill(){},stroke(){},fillRect(){},
   strokeText(){},fillText(){},drawImage(image,...args){calls.push({key:image.key,args,clip})}};
 const renderer=Object.create(ctx.BookShots.prototype);
 Object.assign(renderer,{c,reducedMotion:false,image:key=>({key,width:960,height:600}),
   tinted:new Map([['intro-dragon-0',{key:'shadow-0'}],['intro-dragon-1',{key:'shadow-1'}]])});
 return {renderer,calls,paths,draw(time){calls.length=0;paths.length=0;renderer.intro(time);return calls}};
}
function introSceneFixture(){
 ctx.BookFilm=class {constructor(){this.duration=29000}draw(){}destroy(){}};
 const texts=[],objects=[];
 function art(x=0,y=0,texture=''){
  const o={x,y,texture,text:'',alpha:1,visible:true,list:[],active:true,
   setDisplaySize(w,h){this.displayWidth=w;this.displayHeight=h;return this},setOrigin(){return this},
   setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this},setTint(){return this},setAlpha(a){this.alpha=a;return this},setAngle(a){this.angle=a;return this},
   setVisible(v){this.visible=v;return this},setPosition(x,y){this.x=x;this.y=y;return this},
   setTexture(k){this.texture=k;return this},setText(t){this.text=t;return this},setInteractive(){return this},on(){return this},
   setMask(mask){this.mask=mask;return this},setDepth(){return this},destroy(){this.active=false},
   add(items){this.list.push(...(Array.isArray(items)?items:[items]));return this}};
  objects.push(o);return o;
 }
 const s=new ctx.IntroScene();
 s.add={container:art,image:art,ellipse:art,rectangle:art,text(x,y,t){const o=art(x,y);o.text=t;texts.push(o);return o}};
 s.make={graphics(){return {fillStyle(){return this},fillPoints(points){this.points=points;return this},createGeometryMask(){return {geometryMask:this,destroy(){}}},destroy(){}}}};
 s.input={on(){},off(){},keyboard:{on(){}}};s.events={once(){}};s.scene={start(){}};ctx.stopMusic=()=>{};
 s.create();return {s,texts,objects};
}
test('creating the intro immediately starts playback, with just a discreet Skip overlay',()=>{
 const {s,texts}=introSceneFixture();
 assert.equal(s.started,true);assert.equal(s.suspended,false);assert.equal(s.elapsed,0);
 assert.equal(s.startPanel,undefined);assert.equal(s.soundButton,undefined);assert.equal(s.caption,undefined);
 assert.equal(s.skipButton.text,'Überspringen · Leertaste');assert.ok(s.skipButton.alpha<1);
 assert.ok(!texts.some(o=>/Eine kleine Geschichte|Ton:|Intro starten|iPad|Tastatur/.test(o.text)));
});
test('book artwork keeps the projected shadow behind the bed and the dragon behind foreground masonry',()=>{
 const {draw}=bookShotFixture();let calls=draw(2800);
 const shadow=calls.findIndex(c=>c.key.startsWith('shadow-'));
 assert.ok(shadow>=0&&shadow<calls.findIndex(c=>c.key==='intro-bed-fixed'));
 assert.deepEqual(calls[shadow].clip,JSON.parse(JSON.stringify(vm.runInContext('INTRO_FLOOR_LIGHT',ctx))));
 calls=draw(8500);
 const dragon=calls.findIndex(c=>c.key.startsWith('intro-dragon-'));
 const foreground=calls.filter(c=>c.key==='intro-exterior'&&c.clip);
 assert.equal(foreground.length,3);
 assert.ok(foreground.every(layer=>calls.indexOf(layer)>dragon));
});
test('blocked audio does not queue past effects or prevent playback; a later gesture joins the current music time',async()=>{
 const voices=[];let allowed=false;
 class Context{
  constructor(){this.state='suspended';this.destination={}}
  createGain(){return {gain:{value:1},connect(){}}}
  decodeAudioData(){return Promise.resolve({duration:32})}
  resume(){if(allowed)this.state='running';return Promise.resolve()}
  createBufferSource(){const voice={connect(){},disconnect(){},start(at,offset){this.offset=offset},stop(){}};voices.push(voice);return voice}
  close(){return Promise.resolve()}
 }
 const a=new ctx.IntroAudio(Context,()=>Promise.resolve({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(1))}));
 await a.ready;await a.start();a.play('whoosh');a.play('hop');assert.equal(voices.length,0);
 allowed=true;await a.unlock(12000);assert.equal(voices.length,1);assert.equal(voices[0].offset,12);
 a.play('boing');assert.equal(voices.length,2);a.destroy();
});

test('the shadow arrives after a short opening while the idea credit stays readable',()=>{
 assert.equal(ctx.getIntroFrame(1900).shadow.alpha,0);
 assert.ok(ctx.getIntroFrame(2250).shadow.alpha>0);
 assert.equal(ctx.getIntroFrame(1500).creditAlpha,1);assert.equal(ctx.getIntroFrame(3000).creditAlpha,1);
});
test('sleep letters visibly rise from the knight until waking, and disappear in the outside shot',()=>{
 assert.ok(ctx.getIntroFrame(0).sleepSymbols.some(z=>z.alpha>.6));
 const a=ctx.getIntroFrame(300).sleepSymbols[0],b=ctx.getIntroFrame(900).sleepSymbols[0];
 assert.ok(b.y<a.y);assert.ok(b.x>a.x);assert.ok(b.scale>a.scale);
 assert.ok(ctx.getIntroFrame(14000).sleepSymbols.some(z=>z.alpha>.6));
 assert.ok(ctx.getIntroFrame(8000).sleepSymbols.every(z=>z.alpha===0));
 assert.ok(ctx.getIntroFrame(18000).sleepSymbols.every(z=>z.alpha===0));
});
test('jump preparation, push-off, tucked flight and landing use distinct poses before settling',()=>{
 assert.equal(ctx.getIntroFrame(20200).occupant.pose,'prepare');
 assert.ok(ctx.getIntroFrame(20200).occupant.scaleY<1);
 for(const [time,pose] of [[20500,'push'],[20900,'air'],[21600,'ready'],[21800,'land'],[22400,'ready']])assert.equal(ctx.getIntroFrame(time).knight.pose,pose);
 const landing=ctx.getIntroFrame(21800).knight;assert.ok(landing.scaleX>1);assert.ok(landing.scaleY<1);
 assert.equal(landing.y,535);assert.equal(ctx.getIntroFrame(22400).knight.x,565);
});
test('all book intro frames keep the bed and its foreground fixed while the knight moves',()=>{
 const {draw}=bookShotFixture();
 for(let t=0;t<=27800;t+=1000/60){
  if(ctx.getIntroFrame(t).stage==='exterior')continue;
  const calls=draw(t),bed=calls.find(c=>c.key==='intro-bed-fixed'),front=calls.find(c=>c.key==='intro-bed-front');
  assert.deepEqual(bed.args,[0,0]);assert.deepEqual(front.args,[0,0]);
  assert.equal(bed.clip,null);assert.equal(front.clip,null);
  const f=ctx.getIntroFrame(t),hero=calls.findIndex(c=>c.key==='intro-hero-'+(f.occupant.visible?f.occupant.pose:f.knight.pose));
  if(f.occupant.visible||f.knight.behindBed)assert.ok(hero<calls.indexOf(front));
 }
});
test('the book renderer keeps the curved blanket over the knight, and helper landings only deform the cloth',()=>{
 const {draw}=bookShotFixture();
 for(const t of [15300,16300,17300]){
  const f=ctx.getIntroFrame(t);assert.equal(f.helper.x,306);assert.equal(f.helper.groundY,354);assert.equal(f.helper.y,f.helper.groundY);
  assert.equal(ctx.introCuesBetween(t-1,t+1)[0][1],'boing');assert.ok(f.helper.stretch<1);assert.ok(f.blanket.scaleY<1);
  const calls=draw(t),hero=calls.findIndex(c=>c.key==='intro-hero-sleep'),blanket=calls.findIndex(c=>c.key==='intro-blanket-occupied');
  const front=calls.findIndex(c=>c.key==='intro-bed-front');assert.ok(hero<blanket&&blanket<front);
  assert.equal(calls[hero].clip,null);assert.deepEqual(calls.find(c=>c.key==='intro-bed-fixed').args,[0,0]);
 }
 assert.equal(ctx.getIntroFrame(20000).blanket.empty,0);
 assert.ok(ctx.getIntroFrame(20650).blanket.empty>0&&ctx.getIntroFrame(20650).blanket.empty<1);
 assert.equal(ctx.getIntroFrame(21000).blanket.empty,1);
});
for(const reduced of [false,true])test(`jump layer changes only once after clearing the bedding, reduced motion: ${reduced}`,()=>{
 let previous=true,changes=0;
 for(let t=20450;t<=22300;t+=10){
  const k=ctx.getIntroFrame(t,reduced).knight;
  if(k.behindBed!==previous){changes++;assert.ok(k.y<=380);}
  previous=k.behindBed;
 }
 assert.equal(changes,1);
});

test('world films load and play effects without a background music voice',async()=>{
 const {audio,voices}=audioFixture({music:false});await audio.ready;await audio.start();
 assert.equal(audio.buffers.has('music'),false);assert.equal(voices.length,0);
 audio.play('reveal');assert.equal(voices.length,1);assert.equal(voices[0].loop,false);
 audio.pause();await audio.resume();assert.equal(voices.length,1);audio.destroy();
});
test('a new adventure skips to the desert, while a startup intro skips to the menu',()=>{
 for(const newGame of [true,false]){
  const destinations=[];const scene=Object.create(ctx.IntroScene.prototype);
  Object.assign(scene,{newGame,audio:{destroy(){}},scene:{start:key=>destinations.push(key)}});
  scene.finish();scene.finish();assert.deepEqual(destinations,[newGame?'DessertMapScene':'MainMenuScene']);
 }
});

for(const profile of ['ipadKeyboard','pc','ipadTouch'])test(profile+': world-story films consume skip keys and ignore skip actions',()=>{
 const Clue=vm.runInNewContext(fs.readFileSync(path.join(root,'src/scenes/DragonClueScene.js'),'utf8')
  .replace(/^import .*;\n/gm,'').replace('export default class DragonClueScene','class DragonClueScene')
  +'\nDragonClueScene;',{Phaser:{Scene:class{}}});
 const story=new Clue();let finishes=0;story.finish=()=>finishes++;
 assert.equal(story.canSkip,false);
 const controls=Object.create(ctx.PortableControls.prototype);
 Object.assign(controls,{activeScene:()=>story,getProfile:()=>profile,pressedKeys:new Set(),held:new Set()});
 for(const code of ['Space','Enter']){
  const event={code,preventDefault(){},stopImmediatePropagation(){}};
  controls.onKey(event,true);controls.onKey(event,false);
 }
 for(const action of ['attack','confirm','back'])controls.dispatch(action,story);
 assert.equal(finishes,0);
});
