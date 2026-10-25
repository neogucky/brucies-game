const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx={Promise,Map,Set,globalThis:null,Phaser:{Scene:class{}},performance:{now:()=>1}};
ctx.globalThis=ctx;vm.createContext(ctx);
function load(file,name){let code=fs.readFileSync(path.join(root,file),'utf8').replace(/^import[\s\S]*?;\n/gm,'');if(name)code=code.replace(/export default class \w+/,`globalThis.${name}=class ${name}`);vm.runInContext(code.replace(/export /g,''),ctx)}
load('src/utils/introTimeline.js');load('src/utils/IntroAudio.js','IntroAudio');load('src/scenes/IntroScene.js','IntroScene');load('src/utils/controlProfiles.js');load('src/utils/PortableControls.js','PortableControls');

test('the story follows sleep, shadow, window, treasure dragon, bouncing, yawn and ready beats',()=>{
 for(const [time,beat] of [[0,'sleep'],[5400,'shadow'],[7900,'window'],[11200,'dragon'],[16400,'return'],[19000,'wake'],[21600,'yawn'],[24600,'ready']])assert.equal(ctx.getIntroFrame(time).beat,beat);
 assert.equal(ctx.getIntroFrame(0).helper.pose,'sleep');assert.equal(ctx.getIntroFrame(19000).bedPose,'sleep');assert.equal(ctx.getIntroFrame(21600).bedPose,'yawn');assert.equal(ctx.getIntroFrame(24600).bedPose,'empty');assert.equal(ctx.getIntroFrame(24600).knight.visible,true);
 assert.equal(ctx.getIntroFrame(22500).bedPose,'awake');
});
test('both requested credit lines appear in order, one at a time, and remain readable for several seconds',()=>{
 assert.equal(ctx.getIntroFrame(2000).credit,'Spielidee von Brucy');assert.equal(ctx.getIntroFrame(11000).credit,'Entwickelt mit Onkel Tim');
 assert.equal(ctx.getIntroFrame(2000).creditAlpha,1);assert.equal(ctx.getIntroFrame(11000).creditAlpha,1);assert.equal(ctx.getIntroFrame(6000).credit,'');
});
test('scene cuts occur under black and the dragon crosses above the castle from left to right',()=>{
 assert.equal(ctx.getIntroFrame(8900).transition,1);assert.equal(ctx.getIntroFrame(15500).transition,1);
 assert.equal(ctx.getIntroFrame(11200).stage,'exterior');assert.equal(ctx.getIntroFrame(16000).stage,'bedroom');
 assert.ok(ctx.getIntroFrame(10000).dragon.x<ctx.getIntroFrame(14000).dragon.x);
 assert.ok(ctx.getIntroFrame(11000).dragon.y<350);
});
test('helper actually reaches the windowsill, bounces on the bed, and ends beside the ready knight',()=>{
 const sill=ctx.getIntroFrame(8500);assert.equal(sill.helper.x,764);assert.equal(sill.helper.y,363);assert.equal(sill.helper.pose,'peek');
 const bounce=ctx.getIntroFrame(18500);assert.equal(bounce.helper.x,280);assert.ok(bounce.helper.y<405);
 const end=ctx.getIntroFrame(28000);assert.equal(end.helper.x,695);assert.equal(end.knight.x,510);assert.equal(end.helper.y,end.knight.y);
});
test('reduced motion keeps the whole story but reduces jump height',()=>{
 const normal=ctx.getIntroFrame(18500),reduced=ctx.getIntroFrame(18500,true);assert.equal(normal.beat,reduced.beat);assert.ok(reduced.helper.y>normal.helper.y);
});
test('intro clock clamps invalid/end times and only completes after the ending title',()=>{
 assert.equal(ctx.getIntroFrame(-30).time,0);assert.equal(ctx.getIntroFrame(NaN).time,0);assert.equal(ctx.getIntroFrame(29000).done,false);assert.equal(ctx.getIntroFrame(30500).done,true);assert.equal(ctx.getIntroFrame(99999).time,30500);
});
test('audio cues cannot be replayed or skipped at a normal frame boundary',()=>{
 assert.equal(ctx.introCuesBetween(4690,4710)[0][1],'whoosh');assert.equal(ctx.introCuesBetween(4700,4710).length,0);
 const cues=[];for(let t=0;t<30500;t+=17)cues.push(...ctx.introCuesBetween(t,Math.min(30500,t+17)));
 assert.equal(cues.length,18);assert.equal(new Set(cues.map(c=>c[0])).size,cues.length);
});
test('return destinations are limited to menus and maps',()=>{
 for(const key of ['MainMenuScene','DessertMapScene','UndergroundMapScene','JungleMapScene'])assert.equal(ctx.introReturnScene(key),key);
 assert.equal(ctx.introReturnScene('JungleScene'),'MainMenuScene');assert.equal(ctx.introReturnScene(), 'MainMenuScene');
});
test('skip is safe before playback, during playback and after completion, and never writes a save',()=>{
 for(const started of [false,true]){let destinations=[],stops=0;const s=Object.create(ctx.IntroScene.prototype);Object.assign(s,{started,returnScene:'JungleMapScene',audio:{destroy(){stops++}},scene:{start(key){destinations.push(key)}},registry:{set(){throw new Error('must not alter save')}}});s.finish();s.finish();assert.deepEqual(destinations,['JungleMapScene']);assert.equal(stops,1)}
});
test('tab switching freezes the story and the same Confirm action resumes it',()=>{
 let paused=0,resumed=0;const panel={setVisible(){}},text={setText(){return this},setFontSize(){return this}};
 const s=Object.create(ctx.IntroScene.prototype);Object.assign(s,{started:true,elapsed:11900,returnScene:'MainMenuScene',audio:{pause(){paused++},resume(){resumed++}},startPanel:panel,startTitle:text,startButton:text});
 s.suspendIntro();s.update(0,5000);assert.equal(s.elapsed,11900);assert.equal(paused,1);s.startIntro();assert.equal(s.suspended,false);assert.equal(resumed,1);
});
test('credits use real elapsed time rather than an accelerated game-loop delta',()=>{
 const original=ctx.performance.now;let now=1000;ctx.performance.now=()=>now;
 try{
  const s=Object.create(ctx.IntroScene.prototype);Object.assign(s,{started:true,elapsed:0,lastFrameAt:1000,audio:{play(){},setMusicVolume(){}},drawFrame(){}});
  now=1050;s.update(0,5000);assert.equal(s.elapsed,50);now=1070;s.update(0,5000);assert.equal(s.elapsed,70);
 }finally{ctx.performance.now=original}
});
for(const profile of ['ipadKeyboard','pc','ipadTouch'])test(`${profile}: only the selected Start and Skip actions control the intro`,()=>{
 let starts=0,skips=0;const s={isIntro:true,startIntro(){starts++},finish(){skips++}};const c=Object.create(ctx.PortableControls.prototype);c.activeScene=()=>s;c.getProfile=()=>profile;c.held=new Set();
 if(profile==='ipadTouch'){for(const code of ['KeyE','KeyQ','Enter','Escape'])c.onKey({code,preventDefault(){},stopImmediatePropagation(){}},true);assert.equal(starts+skips,0);c.dispatch('confirm');c.dispatch('back')}
 else{c.onKey({code:profile==='pc'?'Enter':'KeyE',preventDefault(){},stopImmediatePropagation(){}},true);c.onKey({code:profile==='pc'?'Escape':'KeyQ',preventDefault(){},stopImmediatePropagation(){}},true)}
 c.dispatch('attack');c.dispatch('shoot');assert.equal(starts,1);assert.equal(skips,1);
});

function audioFixture(){
 let instances=0;const voices=[];
 class Context{
  constructor(){instances++;this.state='suspended';this.destination={}}
  createGain(){return {gain:{value:1},connect(){}}}
  decodeAudioData(){return Promise.resolve({duration:1})}
  createBufferSource(){const voice={connect(){},disconnect(){},start(){this.playing=true},stop(){this.playing=false}};voices.push(voice);return voice}
  resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}close(){this.state='closed';return Promise.resolve()}
 }
 const audio=new ctx.IntroAudio(Context,()=>Promise.resolve({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(1))}));return {audio,voices,instances:()=>instances};
}
test('one user gesture unlocks all sound cues; pause/resume keeps the same context and music voice',async()=>{
 const {audio,voices,instances}=audioFixture();await audio.ready;audio.start();await Promise.resolve();audio.play('whoosh');assert.equal(instances(),1);assert.equal(voices.length,2);
 audio.pause();assert.equal(audio.context.state,'suspended');audio.resume();await Promise.resolve();assert.equal(audio.context.state,'running');assert.equal(voices.length,2);
 audio.mute(true);assert.equal(audio.master.gain.value,0);audio.mute(false);assert.equal(audio.master.gain.value,1);audio.destroy();
});
test('leaving disposes every voice and context; late loading cannot restart the intro music',async()=>{
 const {audio,voices}=audioFixture();audio.start();audio.destroy();await audio.ready;await Promise.resolve();assert.equal(voices.length,0);assert.equal(audio.context.state,'closed');assert.equal(audio.buffers.size,0);assert.doesNotThrow(()=>audio.destroy());
 const b=audioFixture();await b.audio.ready;b.audio.start();await Promise.resolve();b.audio.play('boing');b.audio.destroy();assert.ok(b.voices.every(v=>!v.playing));
});
test('missing audio remains silent without blocking Start, Skip or cleanup',async()=>{
 const a=new ctx.IntroAudio(undefined,undefined);await a.ready;assert.doesNotThrow(()=>{a.start();a.pause();a.resume();a.mute(true);a.destroy()});
});
test('every generated audio file is valid, audible PCM with safe peak headroom',()=>{
 for(const name of ['music','snore','whoosh','hop','boing','yawn','chime']){
  const wav=fs.readFileSync(path.join(root,'assets/intro/sounds',name+'.wav'));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');assert.equal(wav.readUInt32LE(24),22050);let peak=0;for(let i=44;i<wav.length;i+=2)peak=Math.max(peak,Math.abs(wav.readInt16LE(i)));assert.ok(peak>1000&&peak<30000,name);
 }
});
