import { defaultSave, unlockAllForTesting } from '../src/saveManager.js';
import { applyWeaponAppearance } from '../src/utils/weapons.js?v=20261030-sword-camera-2';

const frame = document.querySelector('iframe'), status = document.getElementById('status');
const root = new URL('../', location.href).href;
let game, win, current, held = [];
let galleryMode, swordPlaying = false, swordDirection = 1, swordElapsed = 65;
const wait = async (condition, label = 'Spiel', timeout = 20000) => {
  const start = performance.now();
  while (!condition()) { if (performance.now() - start > timeout) throw Error('Zeitüberschreitung: ' + label); await new Promise(requestAnimationFrame); }
};
const steps = async (n = 3) => { for (let i=0; i<n; i++) await new Promise(resolve=>game.events.once('poststep',resolve)); };
const seed = { ...unlockAllForTesting(structuredClone(defaultSave), 'jungle'), health: 5, lastPlayed: '2026-10-29',
  tutorials: { powerHammer: { offered:true, completed:true } }, settings: { controlProfile:'ipadKeyboard', autoAim:false } };
seed.inventory.weapons.powerHammer = true; seed.inventory.passives.bow = true; seed.inventory.passives.companion = true;
seed.equipped = { ...seed.equipped, weapon:'sword', secondary:'bow', companion:'default', shoes:null };

function key(code, down = true) { win.dispatchEvent(new win.KeyboardEvent(down ? 'keydown' : 'keyup', { code, key:code==='Space'?' ':code, bubbles:true, cancelable:true })); }
function release() { for (const code of held) key(code,false); held = []; }
async function hold(codes, ms) { release(); codes.forEach(code=>key(code)); held=codes; const start=performance.now(); await wait(()=>performance.now()-start>ms,'Bewegung'); release(); }
async function boot() {
  const html = await (await fetch(new URL('index.html',root),{cache:'no-store'})).text();
  const instrumentation = `<script>const memory=new Map([['brucies_game_save_v1',${JSON.stringify(JSON.stringify(seed))}]]);Object.defineProperty(window,'localStorage',{value:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)}});window.qaMusic=()=>import('${root}src/soundManager.js');window.qaMelee=()=>import('${root}src/utils/MeleeAnimation.js');window.qaPlayer=()=>import('${root}src/utils/PlayerAnimation.js');window.motionErrors=[];window.addEventListener('error',e=>motionErrors.push(e.message));window.addEventListener('unhandledrejection',e=>motionErrors.push(String(e.reason)));const RealGame=Phaser.Game;Phaser.Game=class extends RealGame{constructor(config){super(config);window.motionGame=this}};</script>`;
  frame.srcdoc=html.replace('<head>','<head><base href="'+root+'">').replace('<!-- Version local modules',instrumentation+'<!-- Version local modules');
  await wait(()=>frame.contentWindow?.motionGame?.registry.get('level-motion-assets'),'Assets');win=frame.contentWindow;game=win.motionGame;
  game.portableControls.autoPause=()=>{};
  await wait(()=>game.scene.isActive('IntroScene'),'Intro'); await start('JungleScene');
  const sound=game.sound,play=sound.play.bind(sound);game.motionSounds=[];sound.play=(key,...args)=>{game.motionSounds.push(key);return play(key,...args)};
  const view=new URLSearchParams(location.search).get('gallery');
  if(view==='melee')await gallery(false);else if(view==='proportions')await gallery('proportions');else if(['sword','hands'].includes(view))await gallery(view);
}
async function start(name) {
  galleryMode = null; document.getElementById('sword-tools').hidden = true;
  game.portableControls.resume(); release(); for(const s of game.scene.getScenes(true)) game.scene.stop(s.sys.settings.key);
  game.scene.start(name,name==='JungleScene'?{levelId:'Lianenpfad'}:name==='CoinChallengeScene'?{world:'underground'}:name==='UndergroundDigScene'?{levelId:'UnderDig'}:{});
  await wait(()=>game.scene.getScene(name)?.player?.active&&game.scene.isActive(name),'Level'); current=game.scene.getScene(name);await steps(3);
  if(current.startScreen?.active) await wait(()=>!current.startScreen?.active,'Startbild',8000);
  if(current.dialog?.container?.visible){current.dialog.hide?.();}
  current.isPaused=false;current.time.paused=false;current.physics.world.resume();
  if(name==='CoinChallengeScene'){ current.startAttempt();await wait(()=>current.running,'Startschuss',7000); }
  current.player.setData('invulnerableUntil',1e12);current.player.setVelocity?.(0,0); await steps(12); show();
}
function show(extra='') {
  const s=current,p=s?.player,a=s?.playerAnimation;
  status.textContent=`${s?.sys.settings.key} · ${game.registry.get('saveData')?.playerGender||'male'} · ${s?.equipped?.weapon||'ohne Waffe'} · ${a?.state} · Bild ${a?.currentFrame?.index} · Körper ${p?.body?.width}×${p?.body?.height}\n${extra}\n${win.motionErrors.length?'FEHLER: '+win.motionErrors.join('\n'):'Keine Laufzeitfehler'}`;
}
async function action(name) {
  const s=current;
  if(name==='walk'||name==='run'){
    if(s.equipped)s.equipped.shoes=name==='run'?'shoes':null;
    if(s.equipment)s.equipment.shoes=name==='run'; s.hasShoes=name==='run';
    if(name==='run'){await hold(['ArrowRight'],50);await steps(6);}
    await hold(['ArrowRight'],1000);
  }
  if(name==='jump')await hold(['ArrowUp'],430);
  if(name==='crouch')await hold(['ArrowDown'],1200);
  if(name==='swing')await hold(['Space'],s.equipped?.weapon==='powerHammer'?1200:100);
  if(name==='bow')await hold(['ShiftLeft'],120);
  if(name==='berry'){s.health=3;s.spawnFruit?.();}
  if(name==='crumble') { const b=s.blocks?.getChildren().find(b=>b.getData('type')==='earth'&&Math.hypot(b.x-s.player.x,b.y-s.player.y)<250);if(b)s.removeEarthAt(b.getData('col'),b.getData('row')); }
  if(name==='hurt') {
    const target=s.companionActions?.target();
    if(!target&&s.monkeys?.length){const m=s.monkeys.find(m=>!m.isBoss);m.hidden=false;m.x=s.helper.x+85;m.y=s.helper.y;m.sprite.setPosition(m.x,m.y);m.nextThrowAt=1e8;m.nextClimbAt=1e8;}
    s.events.emit('player-hurt',{amount:1,health:4});
  }
  await steps();show();
}
document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>start(b.dataset.scene).catch(fail));
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action).catch(fail));
document.getElementById('gender').onclick=async()=>{const save=game.registry.get('saveData');save.playerGender=save.playerGender==='female'?'male':'female';if(current.sys.settings.key==='MotionGallery')await gallery(galleryMode);else await start(current.sys.settings.key);};
document.getElementById('weapon').onclick=()=>{if(!current.equipped)return;current.equipped.weapon=current.equipped.weapon==='powerHammer'?'sword':'powerHammer';applyWeaponAppearance(current);show();};
document.getElementById('shoes').onclick=()=>{if(current.equipped)current.equipped.shoes=current.equipped.shoes?null:'shoes';show();};
async function gallery(motion=false){
  galleryMode = motion; document.getElementById('sword-tools').hidden = !['sword','hands'].includes(motion);
  document.getElementById('sword-direction').hidden=motion==='hands';document.getElementById('hand-state').parentElement.hidden=motion!=='hands';
  release();for(const s of game.scene.getScenes(true))game.scene.stop(s.sys.settings.key);
  const mod=await win.qaMelee();
  const playerMod=await win.qaPlayer();
  const {motionFrame}=await import(new URL('src/utils/PlayerAnimation.js',root));
  const {default:KnightGait}=await import(new URL('src/utils/KnightGait.js',root));
  const Phaser=win.Phaser;
  class Review extends Phaser.Scene{
    constructor(){super('MotionGallery')}
    create(){
      this.add.rectangle(480,300,960,600,0x253943);
      this.add.text(26,16,motion==='hands'?'Feste Kamera · rechte Schulter hinten / vorn':motion==='sword'?'Schwert B · Stehend / Geduckt / In der Luft':motion==='proportions'?'Standpose, Gehen und Rennen · gleiche Proportionen':motion?'Gehen / Rennen / Übergänge / Helfer':'Schulter → Oberarm → Unterarm → Waffe',{fontSize:'23px',color:'#ffedba'});
      const assets=this.registry.get('level-motion-assets');
      this.gaits=[];
      if(motion==='hands'){
        this.swords=[];this.handIdles=[];
        for(let row=0;row<2;row++)for(let col=0;col<4;col++){
          const x=115+col*240,y=280+row*270,direction=col<2?-1:1,attack=col%2===1,unit=1.45,scale=.6*unit;
          const p=this.add.image(x,y,'knight-standing').setOrigin(.5,1).setScale(scale);
          p.setData('standingTexture','knight-standing');p.body={blocked:{down:true},touching:{down:false},velocity:{x:0,y:0},destroy(){}};
          const save=this.registry.get('saveData'),registry={get:k=>k==='saveData'?{...save,playerGender:row?'female':'male'}:this.registry.get(k)};
          const fake={add:this.add,registry,events:this.events,sys:{settings:{key:'HandGallery'}},gameMode:'jump',time:this.time,player:p,equipped:{weapon:'sword'},facingX:direction,isDucking:false,isSwinging:attack,swingStartedAt:0,worldTime:swordElapsed,
            getMeleeBounds:()=>({x:direction>0?x:x-48*unit,y:y-(fake.isDucking?38:76)*unit,width:48*unit,height:(fake.isDucking?38:76)*unit})};
          this.add.line(0,0,x-105,y,x+105,y,0x718783).setOrigin(0);
          const a=attack?new mod.default(fake):new playerMod.default(fake);a.update(16);
          if(!attack)a.nextSpecial=Infinity;
          if(attack)this.swords.push({a,fake});else this.handIdles.push(a);
          this.add.text(x,y+10,(row?'Ritterin':'Ritter')+' · '+(attack?'Schlag':'Bereit')+(direction<0?' ←':' →'),{fontSize:'16px',color:'#ffedba'}).setOrigin(.5,0);
          this.add.text(x,y+31,direction<0?'Rechte Schulter hinten':'Rechte Schulter vorn',{fontSize:'12px',color:'#bbcfc3'}).setOrigin(.5,0);
          this.events.once('shutdown',()=>a.destroy());
        }
        return;
      }
      if(motion==='sword'){
        this.swords=[];
        for(let row=0;row<2;row++)for(let col=0;col<3;col++){
          const x=160+col*310,y=280+row*270,unit=1.6,scale=.6*unit,tile=38*unit,stance=['stand','crouch','jump'][col];
          const save=this.registry.get('saveData');
          const p=this.add.image(x,y,'knight-standing').setOrigin(.5,1).setScale(scale);
          p.setData('standingTexture','knight-standing'); p.body={blocked:{down:stance!=='jump'},touching:{down:false},velocity:{x:0,y:stance==='jump'?-150:0},destroy(){}};
          const registry={get:k=>k==='saveData'?{...save,playerGender:row?'female':'male'}:this.registry.get(k)};
          const fake={add:this.add,registry,gameMode:'jump',time:this.time,player:p,equipped:{weapon:'sword'},facingX:1,isDucking:stance==='crouch',isSwinging:true,swingStartedAt:0,worldTime:swordElapsed,
            getMeleeBounds:()=>({x:swordDirection>0?x:x-48*unit,y:y-(stance==='crouch'?tile:tile*2),width:48*unit,height:stance==='crouch'?tile:tile*2})};
          this.add.line(0,0,x-135,y,x+135,y,0x718783).setOrigin(0);
          fake.targets=[];
          for(let n=0;n<2;n++)fake.targets.push(this.add.rectangle(x+90,y-(n+.5)*tile,50,tile-2,0x678c7f,stance==='crouch'&&n===1?.07:.22).setStrokeStyle(1,0x8caea0,.5));
          const a=new mod.default(fake);a.update();
          this.add.text(x,y+9,(row?'Ritterin':'Ritter')+' · '+['Stehend','Geduckt','Springend'][col],{fontSize:'17px',color:'#ffedba'}).setOrigin(.5,0);
          this.add.text(x,y+31,['Beide Reihen','Nur die untere Reihe','Schlag in der Luft'][col],{fontSize:'13px',color:'#bbcfc3'}).setOrigin(.5,0);
          this.swords.push({a,fake});
        }
        return;
      }
      if(motion==='proportions'){
        for(let row=0;row<2;row++)for(let col=0;col<3;col++){
          const x=170+col*300,y=288+row*262,scale=1.35;
          this.add.line(0,0,x-110,y,x+110,y,0x718783).setOrigin(0);
          if(col===0)this.add.image(x,y,assets.poses[row*16].key).setOrigin(.5,1).setScale(scale);
          else{
            const g=new KnightGait(this),torso=this.add.image(x,y,assets.rig.torsos[row*2+(col===2?1:0)].key).setOrigin(.5,1).setScale(scale).setDepth(3);
            const config={running:col===2,direction:-1,scale,x,feetY:y,depth:2,alpha:1,visible:true};
            g.update({delta:0,...config});this.gaits.push({g,torso,config});
          }
          this.add.text(x,y+9,(row?'Ritterin':'Ritter')+' · '+['Standpose','Gehen','Rennen'][col],{fontSize:'18px',color:'#ffedba'}).setOrigin(.5,0);
        }
        return;
      }
      for(let row=0;row<4;row++)for(let col=0;col<6;col++){
        const x=95+col*150,y=165+row*136;
        this.add.line(0,0,x-64,y,x+62,y,0x718783).setOrigin(0);
        if(motion){
          if(row===3){const i=[0,3,6,15,19,21][col];this.add.image(x,y,assets.helper[i].key).setOrigin(.5,1).setScale(.7);this.add.text(x-38,y+4,['Ruhe','Gähnen','Hüpfen','Beere','Mut','Sprung'][col],{fontSize:'13px'});}
          else{const state=row===0?'walk':row===1?'run':['crouch','stand','rise','apex','fall','land'][col],elapsed=row<2?col*82:row===2?85:0;
            if(row<2){const g=new KnightGait(this);g.phase=col/6*Math.PI*2;g.update({delta:0,running:row===1,direction:-1,scale:.7,x,feetY:y,depth:2,alpha:1,visible:true});
              this.add.image(x,y,assets.rig.torsos[row].key).setOrigin(.5,1).setScale(.7).setDepth(3);
            }else{const f=motionFrame(state,elapsed,false);this.add.image(x,y,assets[f.atlas][f.index].key).setOrigin(.5,1).setScale(.7);}
            this.add.text(x-40,y+4,row<2?state+' '+col:state,{fontSize:'13px'});}
        }else{
          const weapon=row%2?'powerHammer':'sword',female=row>=2,elapsed=col*(weapon==='sword'?27:63);
          const p=this.add.image(x,y,'knight-standing').setOrigin(.5,1).setScale(.65);
          p.setData('standingTexture','knight-standing');
          const save=this.registry.get('saveData');this.registry.set('saveData',{...save,playerGender:female?'female':'male'});
          const fake={add:this.add,registry:this.registry,textures:this.textures,gameMode:'isometric',facing:{x:1,y:0},worldTime:elapsed,time:this.time,
            player:p,equipped:{weapon},facingX:1,isSwinging:true,swingStartedAt:0,
            getMeleeBounds:()=>({x,y:y-76,width:weapon==='sword'?48:60,height:weapon==='sword'?38:44})};
          const a=new mod.default(fake);a.update();this.add.text(x-55,y+6,(female?'Ritterin ':'Ritter ')+elapsed+'ms',{fontSize:'12px'});this.registry.set('saveData',save);
        }
      }
    }
    update(_time,delta){
      if(this.handIdles){
        const state=document.getElementById('hand-state').value;
        const apply=f=>{f.isDucking=state==='crouch';f.dashActive=state==='run';f.player.body.blocked.down=state!=='jump';f.player.body.velocity={x:['walk','run'].includes(state)?f.facingX*100:0,y:state==='jump'?-150:0};};
        for(const a of this.handIdles){apply(a.scene);a.lastMovementAt=a.clock;}
        for(const {fake}of this.swords)apply(fake);
      }
      for(const {g,torso,config}of this.gaits||[]){g.update({delta,...config});const bob=(config.running?Math.abs(Math.sin(g.phase))*1.5:Math.cos(g.phase*2)*.6)*config.scale;torso.y=config.feetY-bob;}
      if(this.swords){
        if(swordPlaying)swordElapsed=(swordElapsed+Math.min(delta,40)*.45)%140;
        for(const {a,fake}of this.swords){fake.worldTime=swordElapsed;if(fake.targets){fake.facingX=swordDirection;fake.targets.forEach(t=>t.x=fake.player.x+swordDirection*90);}a.state=null;a.lastClock=undefined;a.update();}
      }
      for(const a of this.handIdles||[])a.update(delta);
    }
  }
  if(game.scene.getScene('MotionGallery'))game.scene.remove('MotionGallery');game.scene.add('MotionGallery',Review,true);current=game.scene.getScene('MotionGallery');
  status.textContent=motion==='hands'?'Derselbe rechtshändige Schlag aus beiden Ansichten: Beim Blick nach links verdeckt der Körper die rechte Schulter. Beim Blick nach rechts liegt sie vorn.':motion==='sword'?'Echte Schwertanimation aus dem Spiel, vergrößert. Ganze gemalte Posen, feste Proportionen. Grüne Felder zeigen die beiden Tile-Höhen.':'Originale Bildfolgen aus dem gemeinsamen Animator.';
}
document.getElementById('gallery').onclick=()=>gallery().catch(fail);document.getElementById('motion-gallery').onclick=()=>gallery(true).catch(fail);
document.getElementById('proportions').onclick=()=>gallery('proportions').catch(fail);
document.getElementById('sword-gallery').onclick=()=>gallery('sword').catch(fail);
document.getElementById('hands-gallery').onclick=()=>gallery('hands').catch(fail);
document.getElementById('sword-play').onclick=e=>{swordPlaying=!swordPlaying;e.target.textContent=swordPlaying?'Pause':'Abspielen';};
document.getElementById('sword-frame').oninput=e=>{swordPlaying=false;swordElapsed=Number(e.target.value);document.getElementById('sword-play').textContent='Abspielen';};
document.getElementById('sword-direction').onclick=()=>{swordDirection*=-1;};
document.getElementById('sword-test').onclick=async()=>{
  const passed=[],assert=(v,m)=>{if(!v)throw Error(m);passed.push('✓ '+m);status.textContent=passed.join('\n');};
  try{
    for(const name of ['UndergroundDigScene','JungleScene'])for(const gender of ['male','female'])for(const direction of [-1,1]){
      game.registry.get('saveData').playerGender=gender;await start(name);
      const s=current;s.equipped.weapon='sword';applyWeaponAppearance(s);s.autoAimEnabled=false;s.facingX=direction;
      s.player.body.setVelocity(0,0);await steps(8);
      for(const [codes,expected]of [[[],'stand'],[['ArrowDown'],'crouch'],[['ArrowUp'],'jump']]){
        release();
        await wait(()=>s.player.body.blocked.down||s.player.body.touching.down,'Fester Boden vor '+expected,7000);
        await steps(3);
        if(codes.includes('ArrowUp')){key('ArrowUp');held=['ArrowUp'];await steps(6);}
        else if(codes.length){key(codes[0]);held=codes;await steps(6);}
        const b=s.player.body,bodySize=[b.width,b.height,b.offset.x,b.offset.y],width=s.getMeleeBounds().width;
        let pose,legacyVisible,swordVisible,bodyStable=true;
        const record=()=>{const p=s.meleeAnimation.lastPose;if(s.isSwinging&&p?.renderer==='sword-b'){pose={...p};legacyVisible=p.view==='far'?s.meleeAnimation.sword.body.visible:s.meleeAnimation.images.some(i=>i.visible);swordVisible=p.view==='far'?s.meleeAnimation.body.visible:s.meleeAnimation.sword.body.visible;}bodyStable&&=b.width===bodySize[0]&&b.height===bodySize[1];};
        game.events.on('poststep',record);key('Space');await steps(5);key('Space',false);game.events.off('poststep',record);release();
        assert(pose?.stance===expected,`${name} · ${gender} · ${expected}: richtige vollständige Schlagfolge${pose?.stance===expected?'':' (gesehen: '+JSON.stringify(pose)+')'}`);
        assert(direction<0?pose.view==='far'&&s.meleeAnimation.body.depth>s.meleeAnimation.weapon.depth:s.meleeAnimation.sword.body.flipX===false,
          `${gender} · ${direction}: rechte Schulter ${direction<0?'hinter dem Körper':'vorn'}`);
        assert(swordVisible&&!legacyVisible&&bodyStable,`${expected}: keine zweite Waffe, Körpermaße bleiben gleich`);
        assert(width===48,`${expected}: horizontale Reichweite bleibt 48`);
        await steps(24);
      }
      // Test the actual scene's hit band, not a copied rectangle formula.
      await wait(()=>s.player.body.blocked.down||s.player.body.touching.down,'Landung nach Sprungangriff',7000);
      await steps(3);
      for(const duck of [false,true]){
        s.isDucking=duck;const hit=s.getMeleeBounds(),tile=s.tileSize||38;
        assert(hit.height===tile*(duck?1:2)&&Math.abs(hit.y+hit.height-s.player.body.bottom)<.01,
          `${name}: ${duck?'nur untere Reihe':'beide Reihen'} – auch gegen Gegner`);
      }
      s.isDucking=false;
      s.equipped.weapon='powerHammer';applyWeaponAppearance(s);key('Space');await steps(55);
      assert(s.hammerCharge.holding&&s.meleeAnimation.lastPose?.phase.stage==='charge'&&!s.meleeAnimation.sword.body.visible,
        `${name} · ${gender}: Hammer lädt mit eigener Animation`);
      key('Space',false);await steps(40);
      assert(!win.motionErrors.length,`${name} · ${gender}: ohne Laufzeitfehler`);
    }
    status.textContent=passed.join('\n')+'\nSCHWERTPRÜFUNG BESTANDEN';
  }catch(e){status.textContent=passed.join('\n')+'\nFEHLER: '+e.stack;release();}
};
document.getElementById('music-test').onclick=async()=>{
  const results=[];
  try{
    for(const [name,label]of [['DesertTunnelScene','Steinbruch'],['DesertEndlessScene','Oase']]){
      await start(name);const music=await win.qaMusic();music.bumpMusicRate(1.7);
      const voice=game.sound.get('music-desert');
      if(!voice||voice.rate<1.69)throw Error('Beschleunigung wurde nicht vorbereitet');
      key('KeyQ');key('KeyQ',false);await wait(()=>current.confirmation?.isOpen,'Verlassen-Dialog');
      key('KeyJ');key('KeyJ',false);await wait(()=>game.scene.isActive('DessertMapScene'),'Weltkarte');await steps(8);
      const mapVoice=game.sound.get('music-desert');
      if(mapVoice!==voice||Math.abs(mapVoice.rate-1)>.001)throw Error('Musiktempo auf der Karte: '+mapVoice?.rate);
      results.push('✓ '+label+' verlassen: Tempo 1,0; Musik läuft ohne Neustart weiter.');
    }
    if(win.motionErrors.length)throw Error(win.motionErrors.join('\n'));
    status.textContent=results.join('\n')+'\nMUSIKPRÜFUNG BESTANDEN';
  }catch(e){fail(e);}
};
function fail(e){status.textContent='FEHLER: '+e.stack;console.error(e)}
document.getElementById('test').onclick=async()=>{
  const passed=[];const assert=(v,m)=>{if(!v)throw Error(m);passed.push('✓ '+m);};
  try{
    for(const name of ['DesertRuinScene','DesertEndlessScene','DesertTunnelScene','UndergroundDigScene','JungleScene','CoinChallengeScene']){
      await start(name);const s=current,body=s.player.body;
      const size=[body.width,body.height,body.offset.x,body.offset.y];
      const frames=new Set(),states=new Set(),samples=[];const record=()=>{frames.add(s.playerAnimation.currentFrame?.index);states.add(s.playerAnimation.state);if(samples.length<8)samples.push({x:s.player.x,v:s.player.body.velocity.x,state:s.playerAnimation.state,prev:s.playerAnimation.previous,clock:s.playerAnimation.clock,complete:s.isComplete,bodyPause:s.physics.world.isPaused})};game.events.on('poststep',record);
      await action('walk');game.events.off('poststep',record);
      assert(frames.size>3,name+': echte Gehbilder'+(frames.size>3?'':'; '+JSON.stringify({frames:[...frames],state:s.playerAnimation.state,x:s.player.x,v:s.player.body.velocity.x,paused:s.isPaused,dialog:s.dialog?.container?.visible,samples,errors:win.motionErrors})));
      assert(size[0]===body.width&&size[1]===body.height,name+': Körper bleibt gleich');
      if(s.equipped){states.clear();game.events.on('poststep',record);await action('run');game.events.off('poststep',record);assert(states.has('run'),name+': Laufzyklus erreichbar');}
      assert(!win.motionErrors.length,name+': ohne Laufzeitfehler');
    }
    await start('JungleScene');
    const states=new Set(),record=()=>states.add(current.playerAnimation.state);game.events.on('poststep',record);
    await action('crouch');await action('jump');await steps(120);game.events.off('poststep',record);
    assert(['crouch','stand','rise','fall','land'].every(state=>states.has(state)),'Duck-, Sprung- und Landeübergänge');
    await action('bow');await steps(27);
    assert(current.weaponSwitch.hand==='bow'&&current.player.texture.key.includes('-bow-'),'Bogen übernimmt die Schusspose');
    assert(!current.playerAnimation.body.visible,'Kein zweiter Ritter hinter der Bogenpose');
    assert(game.motionSounds.includes('sfx-bow-release'),'Bogen hat einen eigenen Abschusston');
    await start('UndergroundDigScene');await action('crumble');
    assert(current.levelEffects.particles.length>0,'Zerbrochene Blöcke zeigen echte Textursplitter');
    await start('DesertRuinScene');await action('berry');
    assert(current.fruits.getChildren().some(f=>f.texture.key==='healing-berry'),'Beeren haben ein passendes gemaltes Asset');
    await start('JungleScene');await action('hurt');await steps(125);
    assert(current.companionActions.nextAt>10000,'Helfer: langer Abstand zwischen Gegenangriffen');
    assert(game.motionSounds.includes('sfx-helper-brave'),'Helfer: hörbare Vorbereitung');
    await wait(()=>!current.companionActions.sequence,'Helfersprung',4000);
    assert(!win.motionErrors.length,'Alle Aktionen ohne Laufzeitfehler');
    status.textContent=passed.join('\n')+'\nALLE PRÜFUNGEN BESTANDEN';
  }catch(e){status.textContent=passed.join('\n')+'\nFEHLER: '+e.stack;}
};
boot().catch(fail);
