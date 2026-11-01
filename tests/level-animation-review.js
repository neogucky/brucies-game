import { defaultSave, unlockAllForTesting } from '../src/saveManager.js';
import { applyWeaponAppearance, WEAPON_STATS } from '../src/utils/weapons.js?v=20261101-sword-range-1';

const frame = document.querySelector('iframe'), status = document.getElementById('status');
const root = new URL('../', location.href).href;
let game, win, current, held = [];
let galleryMode, swordPlaying = false, swordDirection = 1, swordElapsed = 65, showJoints = false;
const wait = async (condition, label = 'Spiel', timeout = 20000) => {
  const start = performance.now();
  while (!condition()) { if (performance.now() - start > timeout) throw Error('Zeitüberschreitung: ' + label); await new Promise(requestAnimationFrame); }
};
const steps = async (n = 3) => { for (let i=0; i<n; i++) await new Promise(resolve=>game.events.once('poststep',resolve)); };
const seed = { ...unlockAllForTesting(structuredClone(defaultSave), 'jungle'), health: 5, lastPlayed: '2026-10-29',
  tutorials: { powerHammer: { offered:true, completed:true } }, settings: { controlProfile:'ipadKeyboard', autoAim:false } };
seed.inventory.weapons.powerHammer = true; seed.inventory.passives.bow = true; seed.inventory.passives.companion = true;
Object.assign(seed.inventory.passives,{shield:true,jungleShield:true,shoes:true});seed.inventory.consumables.honey=3;
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
  if(view==='melee')await gallery(false);else if(view==='proportions')await gallery('proportions');else if(['sword','hands','hammer','arms'].includes(view))await gallery(view);
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
async function inventoryReview(){
  game.registry.get('saveData').settings.controlProfile='ipadKeyboard';
  await start('JungleScene');current.toggleInventory();await steps(3);inventoryInfo();
}
function inventoryInfo(){
  const s=current,o=s.inventoryOverlay;
  show('Inventar '+(o?.isOpen?'offen':'geschlossen')+' · '+JSON.stringify(s.equipped)
    +(o?.isOpen?'\nGewählter Platz: '+o.columns[o.selection.col].title+' · Alle Alternativen rechts sichtbar':''));
}
document.getElementById('inventory-open').onclick=()=>inventoryReview().catch(fail);
document.getElementById('inventory-info').onclick=inventoryInfo;
document.getElementById('controls-test').onclick=async()=>{
  const passed=[],assert=(v,m)=>{if(!v)throw Error(m);passed.push('✓ '+m);status.textContent=passed.join('\n');};
  const tap=async code=>{key(code);await steps(2);key(code,false);await steps(2);};
  try{
    for(const profile of ['ipadKeyboard','pc','ipadTouch'])for(const name of ['DesertRuinScene','UndergroundDigScene','JungleScene','JungleMapScene']){
      game.registry.get('saveData').settings.controlProfile=profile;
      if(name.endsWith('MapScene')){
        release();for(const s of game.scene.getScenes(true))game.scene.stop(s.sys.settings.key);
        game.scene.start(name);await wait(()=>game.scene.isActive(name)&&game.scene.getScene(name).toggleInventory,'Karte');
        current=game.scene.getScene(name);await wait(()=>!current.isRevealingMap,'Kartenpfade',12000);await steps(4);
      }else await start(name);
      const s=current,c=game.portableControls,button=win.document.querySelector('#game-controls [data-action="inventory"]');
      await steps(3);const before=button.getBoundingClientRect();
      const toggle=async()=>{if(profile==='ipadTouch'){button.click();await steps(3);}else await tap(profile==='pc'?'Tab':'KeyI');};
      const pause=async()=>{if(profile==='ipadTouch'){win.document.querySelector('#game-controls [data-action="pause"]').click();await steps(3);}else await tap('KeyP');};
      await toggle();assert(s.inventoryOverlay.isOpen,profile+' · '+name+': Inventar öffnet');
      const after=button.getBoundingClientRect();
      assert(button.textContent.includes('Schließen')&&!button.disabled&&Math.abs(after.x-before.x)<.6&&Math.abs(after.y-before.y)<.6,
        profile+': Schließen bleibt am Öffnen-Platz');
      const o=s.inventoryOverlay;o.chooseSlot(0,o.columns[0].options.findIndex(v=>v.id==='powerHammer'));
      await tap('Enter');assert(s.equipped.weapon==='powerHammer'&&o.isOpen,'Enter rüstet aus, ohne ein Level zu starten');
      await tap('Escape');assert(!o.isOpen&&!s.inventoryOpen&&!s.isPaused,'Esc schließt das Inventar und setzt das Spiel fort'
        +' '+JSON.stringify({overlay:o.isOpen,inventory:s.inventoryOpen,paused:s.isPaused,asking:s.confirmation?.isOpen}));
      await toggle();await toggle();assert(!o.isOpen,'Gleiche Taste / gleiche Schaltfläche schließt wieder');
      if(s.player){
        await tap('Escape');assert(s.confirmation?.isOpen,'Esc öffnet die Rückfrage zum Verlassen');
        await tap('Escape');assert(!s.confirmation?.isOpen&&!s.isPaused,'Esc lehnt die Rückfrage ab');
        await pause();await steps(3);assert(c.pausedScene===s,'Pause geöffnet');
        await tap('Enter');await steps(3);assert(!c.pausedScene&&game.scene.isActive(name),'Enter setzt aus Pause fort');
        await pause();await steps(3);await tap('Escape');await steps(3);assert(!c.pausedScene,'Esc schließt Pause');
        await tap('Escape');await tap('Enter');await steps(5);
        assert(!game.scene.isActive(name),'Enter akzeptiert das Verlassen');
      }
    }
    assert(!win.motionErrors.length,'Keine Laufzeitfehler');
    status.textContent=passed.join('\n')+'\nALLE TASTEN- UND INVENTARPRÜFUNGEN BESTANDEN ('+passed.length+')';
  }catch(e){status.textContent=passed.join('\n')+'\nFEHLER: '+e.stack;}
  finally{game.registry.get('saveData').settings.controlProfile='ipadKeyboard';}
};
document.getElementById('hammer-test').onclick=async()=>{
  const passed=[],assert=(v,m)=>{if(!v)throw Error(m);passed.push('✓ '+m);status.textContent=passed.join('\n');};
  try{
    game.registry.get('saveData').settings.controlProfile='ipadKeyboard';
    for(const name of ['UndergroundDigScene','JungleScene'])for(const gender of ['male','female'])for(const direction of [-1,1]){
      game.registry.get('saveData').playerGender=gender;await start(name);
      const s=current;s.equipped.weapon='powerHammer';applyWeaponAppearance(s);s.autoAimEnabled=false;s.facingX=direction;
      for(const stance of ['stand','crouch','jump']){
        release();await wait(()=>s.player.body.blocked.down||s.player.body.touching.down,'Boden',7000);await steps(3);
        if(stance==='crouch'){key('ArrowDown');held=['ArrowDown'];await steps(8);}
        if(stance==='jump'){key('ArrowUp');held=['ArrowUp'];await steps(7);}
        const body=s.player.body,width=body.width,height=body.height;let pose,stable=true,thick=true,anatomy=true,wristNatural=true;
        const record=()=>{
          if(!s.isSwinging)return;
          const a=s.meleeAnimation,p=a.lastPose;if(p?.renderer!=='hammer')return;
          pose={...p};stable&&=body.width===width&&body.height===height;
          const u={x:p.elbow.x-p.shoulder.x,y:p.elbow.y-p.shoulder.y};
          const f={x:p.wrist.x-p.elbow.x,y:p.wrist.y-p.elbow.y};
          const bend=Math.atan2(u.x*f.y-u.y*f.x,u.x*f.x+u.y*f.y);
          anatomy&&=bend<=.0001&&bend>=-Math.PI*5/6-.0001;
          if(p.phase.stage==='strike'){
            const h={x:p.hand.x-p.wrist.x,y:p.hand.y-p.wrist.y};
            const wrist=Math.abs(Math.atan2(f.x*h.y-f.y*h.x,f.x*h.x+f.y*h.y));
            wristNatural&&=wrist<=Math.PI*70/180+.001;
          }
          thick&&=Math.abs(a.upper.scaleY*a.parts.upper.thickness-11*p.scale/.6)<.01
            &&Math.abs(a.forearm.scaleY*a.parts.forearm.thickness-10*p.scale/.6)<.01;
        };
        game.events.on('poststep',record);
        try{
          key('Space');await steps(2);key('Space',false);
          await wait(()=>!s.isSwinging&&!s.hammerCharge.pendingRelease&&!s.weaponSwitch.pending,'Ende des Hammerschlags',3000);
          await steps(2);
        }finally{key('Space',false);game.events.off('poststep',record);}
        assert(pose?.renderer==='hammer'&&pose.stance===stance,name+' · '+gender+' · '+direction+' · '+stance+': eigener Hammerablauf');
        assert(thick&&stable,'Feste Rüstungsbreite und unveränderte Körpermaße');
        assert(anatomy,'Ellbogen beugt natürlich und bleibt innerhalb seiner Gelenkgrenze');
        assert(wristNatural,'Die gemalte Griffhand verdreht das Handgelenk im Schlag nicht nach hinten');
        assert(direction<0?s.meleeAnimation.body.depth>s.meleeAnimation.weapon.depth:!s.meleeAnimation.body.flipX,'Rechter Hammerarm vorn / hinten korrekt');
        if(stance==='crouch')assert(Math.abs(pose.angle+.035)<.001,'Geduckter Angriff bleibt ein Vorstoß');
        else assert(Math.abs(pose.angle)<.01&&Math.abs(pose.hand.y+pose.bounds.bottom+2*pose.scale/.6)<.01,'Stehender / Luftschlag endet mit der Schlagfläche am Boden');
        assert(pose.gripKind==='hammer-overhand'&&Math.abs(pose.handAngle-pose.angle-Math.PI/2)<.001,'Griffhand folgt dem Stiel durch den ganzen Hammerschlag');
        release();await steps(15);
      }
    }
    assert(!win.motionErrors.length,'Keine Laufzeitfehler');
    status.textContent=passed.join('\n')+'\nALLE HAMMERPRÜFUNGEN BESTANDEN ('+passed.length+')';
  }catch(e){status.textContent=passed.join('\n')+'\nFEHLER: '+e.stack;}
};
async function action(name) {
  let s=current;
  if(['trainer','trainer-super','trainer-jump'].includes(name)){
    await start('HammerTrainingScene');s=current;
    if(name==='trainer-super'){s.drillIndex=1;s.beginDrill();await wait(()=>s.mentor.hammerCharge.elapsed>=1560,'Blaue Ladung',6000);}
    else if(name==='trainer-jump'){s.drillIndex=2;s.beginDrill();await wait(()=>s.mentor.demoKeys?.down,'Muck drückt nach unten',5000);}
    else await wait(()=>s.mentor.isSwinging&&s.mentor.worldTime-s.mentor.swingStartedAt>160,'Trainer trifft',5000);
    s.isPaused=true;s.time.paused=true;s.physics.world.pause();await steps(3);
  }
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
  galleryMode = motion; document.getElementById('sword-tools').hidden = !['sword','hands','hammer','arms'].includes(motion);
  document.getElementById('hammer-kind-label').hidden=!['hammer','arms'].includes(motion);
  document.getElementById('arm-weapon-label').hidden=motion!=='arms';
  document.getElementById('sword-frame').max=motion==='hammer'?359:WEAPON_STATS.sword.swingMs-1;
  if(motion==='hammer')swordElapsed=260;
  document.getElementById('sword-frame').value=swordElapsed;
  document.getElementById('sword-direction').hidden=motion==='hands';document.getElementById('hand-state').parentElement.hidden=!['hands','arms'].includes(motion);
  release();for(const s of game.scene.getScenes(true))game.scene.stop(s.sys.settings.key);
  const mod=await win.qaMelee();
  const playerMod=await win.qaPlayer();
  const {hammerAttackForHold}=await import(new URL('src/utils/hammerRules.js',root));
  const {motionFrame}=await import(new URL('src/utils/PlayerAnimation.js',root));
  const {default:KnightGait}=await import(new URL('src/utils/KnightGait.js',root));
  const Phaser=win.Phaser;
  class Review extends Phaser.Scene{
    constructor(){super('MotionGallery')}
    create(){
      this.add.rectangle(480,300,960,600,0x253943);
      this.add.text(26,16,motion==='arms'?'Standpose und echte Schlagphasen · identischer Maßstab':motion==='hammer'?'Power Hammer · Überkopf / Vorstoß / In der Luft':motion==='hands'?'Feste Kamera · rechte Schulter hinten / vorn':motion==='sword'?'Schwert B · Stehend / Geduckt / In der Luft':motion==='proportions'?'Standpose, Gehen und Rennen · gleiche Proportionen':motion?'Gehen / Rennen / Übergänge / Helfer':'Schulter → Oberarm → Unterarm → Waffe',{fontSize:'23px',color:'#ffedba'});
      const assets=this.registry.get('level-motion-assets');
      this.gaits=[];this.jointGraphics=this.add.graphics().setDepth(10000);
      if(motion==='arms'){
        this.armActors=[];
        for(let row=0;row<2;row++)for(let col=0;col<4;col++){
          const x=125+col*235,y=270+row*270,unit=1.6,scale=.6*unit,p=this.add.image(x,y,'knight-standing').setOrigin(.5,1).setScale(scale);
          p.setData('standingTexture','knight-standing');p.body={blocked:{down:true},touching:{down:false},velocity:{x:0,y:0},destroy(){}};
          const save=this.registry.get('saveData'),registry={get:k=>k==='saveData'?{...save,playerGender:row?'female':'male'}:this.registry.get(k)};
          const fake={add:this.add,registry,events:this.events,sys:{settings:{key:'ArmComparison'}},gameMode:'jump',time:this.time,
            player:p,equipped:{weapon:'powerHammer'},facingX:1,isSwinging:col>0,swingStartedAt:0,worldTime:0,
            getMeleeBounds:()=>({x:swordDirection>0?x:x-(fake.equipped.weapon==='sword'?WEAPON_STATS.sword.width:60)*unit,
              y:y-(fake.isDucking?38:76)*unit,width:(fake.equipped.weapon==='sword'?WEAPON_STATS.sword.width:60)*unit,height:(fake.isDucking?38:76)*unit})};
          this.add.line(0,0,x-105,y,x+105,y,0x718783).setOrigin(0);
          const a=col?new mod.default(fake):new playerMod.default(fake);
          this.armActors.push({a,fake,col});this.events.once('shutdown',()=>a.destroy());
          this.add.text(x,y+10,(row?'Ritterin':'Ritter')+' · '+['Referenz','Ausholen','Treffer','Nachschwung'][col],{fontSize:'15px',color:'#ffedba'}).setOrigin(.5,0);
        }
        return;
      }
      if(motion==='hands'){
        this.swords=[];this.handIdles=[];
        for(let row=0;row<2;row++)for(let col=0;col<4;col++){
          const x=115+col*240,y=280+row*270,direction=col<2?-1:1,attack=col%2===1,unit=1.45,scale=.6*unit;
          const p=this.add.image(x,y,'knight-standing').setOrigin(.5,1).setScale(scale);
          p.setData('standingTexture','knight-standing');p.body={blocked:{down:true},touching:{down:false},velocity:{x:0,y:0},destroy(){}};
          const save=this.registry.get('saveData'),registry={get:k=>k==='saveData'?{...save,playerGender:row?'female':'male'}:this.registry.get(k)};
          const fake={add:this.add,registry,events:this.events,sys:{settings:{key:'HandGallery'}},gameMode:'jump',time:this.time,player:p,equipped:{weapon:'sword'},facingX:direction,isDucking:false,isSwinging:attack,swingStartedAt:0,worldTime:swordElapsed,
            getMeleeBounds:()=>({x:direction>0?x:x-WEAPON_STATS.sword.width*unit,y:y-(fake.isDucking?38:76)*unit,width:WEAPON_STATS.sword.width*unit,height:(fake.isDucking?38:76)*unit})};
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
      if(motion==='sword'||motion==='hammer'){
        this.swords=[];
        for(let row=0;row<2;row++)for(let col=0;col<3;col++){
          const x=160+col*310,y=280+row*270,unit=1.6,scale=.6*unit,tile=38*unit,stance=['stand','crouch','jump'][col];
          const save=this.registry.get('saveData');
          const p=this.add.image(x,y,'knight-standing').setOrigin(.5,1).setScale(scale);
          p.setData('standingTexture','knight-standing'); p.body={blocked:{down:stance!=='jump'},touching:{down:false},velocity:{x:0,y:stance==='jump'?-150:0},destroy(){}};
          const registry={get:k=>k==='saveData'?{...save,playerGender:row?'female':'male'}:this.registry.get(k)};
          const reach=(motion==='hammer'?60:WEAPON_STATS.sword.width)*unit;
          const fake={add:this.add,registry,gameMode:'jump',time:this.time,player:p,equipped:{weapon:motion==='hammer'?'powerHammer':'sword'},facingX:1,isDucking:stance==='crouch',isSwinging:true,swingStartedAt:0,worldTime:swordElapsed,
            getMeleeBounds:()=>({x:swordDirection>0?x:x-reach,y:y-(stance==='crouch'?tile:tile*2),width:reach,height:stance==='crouch'?tile:tile*2})};
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
            getMeleeBounds:()=>({x,y:y-76,width:weapon==='sword'?WEAPON_STATS.sword.width:60,height:weapon==='sword'?38:44})};
          const a=new mod.default(fake);a.update();this.add.text(x-55,y+6,(female?'Ritterin ':'Ritter ')+elapsed+'ms',{fontSize:'12px'});this.registry.set('saveData',save);
        }
      }
    }
    update(_time,delta){
      for(const {a,fake,col}of this.armActors||[]){
        const stance=document.getElementById('hand-state').value,kind=document.getElementById('hammer-kind').value;
        fake.equipped.weapon=document.getElementById('arm-weapon').value;fake.facingX=swordDirection;
        fake.isDucking=stance==='crouch';fake.player.body.blocked.down=stance!=='jump';
        fake.player.body.velocity.y=stance==='jump'?-100:0;
        fake.hammerAttack=null;fake.hammerCharge=null;fake.hammerSlamActive=false;
        if(!col){
          a.state=stance==='crouch'?'crouch':stance==='jump'?'rise':'idle';a.elapsed=500;a.nextSpecial=Infinity;a.update(0);continue;
        }
        fake.worldTime=(fake.equipped.weapon==='sword'?[0,17,51,94]:[0,65,150,260])[col];
        if(fake.equipped.weapon==='powerHammer'){
          if(kind==='charge')fake.hammerCharge={holding:true,ready:true,sequence:1,elapsed:[0,400,1050,1750][col]};
          else if(['quick','power','super'].includes(kind)){
            fake.hammerAttack=hammerAttackForHold({quick:400,power:1050,super:1750}[kind]);
            fake.worldTime=[0,40,140,210][col];
          }else if(kind==='slam'){fake.hammerSlamActive=true;fake.worldTime=[0,20,70,150][col];}
        }
        fake.isSwinging=true;
        a.state=null;a.lastClock=undefined;a.update();
        if(fake.equipped.weapon==='powerHammer'&&kind==='recovery'){
          fake.worldTime=319;a.state=null;a.lastClock=undefined;a.update();
          fake.isSwinging=false;a.update();
          fake.worldTime=319+[0,1,45,89][col];a.update();
        }
      }
      if(this.handIdles){
        const state=document.getElementById('hand-state').value;
        const apply=f=>{f.isDucking=state==='crouch';f.dashActive=state==='run';f.player.body.blocked.down=state!=='jump';f.player.body.velocity={x:['walk','run'].includes(state)?f.facingX*100:0,y:state==='jump'?-150:0};};
        for(const a of this.handIdles){apply(a.scene);a.lastMovementAt=a.clock;}
        for(const {fake}of this.swords)apply(fake);
      }
      for(const {g,torso,config}of this.gaits||[]){g.update({delta,...config});const bob=(config.running?Math.abs(Math.sin(g.phase))*1.5:Math.cos(g.phase*2)*.6)*config.scale;torso.y=config.feetY-bob;}
      if(this.swords){
        if(swordPlaying)swordElapsed=(swordElapsed+Math.min(delta,40)*.45)%(motion==='hammer'?360:WEAPON_STATS.sword.swingMs);
        for(const {a,fake}of this.swords){
          fake.worldTime=swordElapsed;
          if(motion==='hammer'){
            const kind=document.getElementById('hammer-kind').value;
            fake.hammerAttack=['quick','power','super'].includes(kind)?hammerAttackForHold({quick:400,power:1050,super:1750}[kind]):undefined;
            fake.hammerCharge=kind==='charge'?{holding:true,ready:true,sequence:1,elapsed:swordElapsed/359*1750}:null;
            fake.hammerSlamActive=kind==='slam';
          }
          if(fake.targets){fake.facingX=swordDirection;fake.targets.forEach(t=>t.x=fake.player.x+swordDirection*90);}a.state=null;a.lastClock=undefined;a.update();
        }
      }
      for(const a of this.handIdles||[])a.update(delta);
      this.jointGraphics.clear();
      if(showJoints)for(const {a}of [...(this.armActors||[]),...(this.swords||[])]){
        const p=a.lastPose;if(!p?.elbow)continue;
        const points=[p.shoulder,p.elbow,p.wrist,p.hand].map(v=>({x:p.x+p.direction*v.x,y:p.feetY+v.y}));
        this.jointGraphics.lineStyle(1.5,0x60f3d0,1).beginPath().moveTo(points[0].x,points[0].y);
        points.slice(1).forEach(v=>this.jointGraphics.lineTo(v.x,v.y));this.jointGraphics.strokePath();
        points.forEach((v,i)=>this.jointGraphics.fillStyle(i===1?0xffb43d:0x60f3d0,1).fillCircle(v.x,v.y,2.8));
      }
    }
  }
  if(game.scene.getScene('MotionGallery'))game.scene.remove('MotionGallery');game.scene.add('MotionGallery',Review,true);current=game.scene.getScene('MotionGallery');
  status.textContent=motion==='hammer'?'Produktionsanimation, vergrößert: voller rechter Arm, fester Handschuh. Stehend durch beide Reihen zum Boden; geduckt ein niedriger Vorstoß.':motion==='hands'?'Derselbe rechtshändige Schlag aus beiden Ansichten: Beim Blick nach links verdeckt der Körper die rechte Schulter. Beim Blick nach rechts liegt sie vorn.':motion==='sword'?'Echte Schwertanimation aus dem Spiel, vergrößert. Ganze gemalte Posen, feste Proportionen. Grüne Felder zeigen die beiden Tile-Höhen.':'Originale Bildfolgen aus dem gemeinsamen Animator.';
}
document.getElementById('gallery').onclick=()=>gallery().catch(fail);document.getElementById('motion-gallery').onclick=()=>gallery(true).catch(fail);
document.getElementById('proportions').onclick=()=>gallery('proportions').catch(fail);
document.getElementById('sword-gallery').onclick=()=>gallery('sword').catch(fail);
document.getElementById('hands-gallery').onclick=()=>gallery('hands').catch(fail);
document.getElementById('hammer-gallery').onclick=()=>gallery('hammer').catch(fail);
document.getElementById('arm-compare').onclick=()=>gallery('arms').catch(fail);
document.getElementById('joint-overlay').onclick=e=>{showJoints=!showJoints;e.target.setAttribute('aria-pressed',String(showJoints));e.target.textContent=showJoints?'Gelenke ausblenden':'Gelenke anzeigen';};
document.getElementById('capture-comparison').onclick=()=>{
  game.events.once('postrender',()=>{
    document.getElementById('review-capture')?.remove();
    const image=document.createElement('img');image.id='review-capture';
    image.alt='Vergleich direkt aus der Spiel-Darstellung';image.style.width='100%';
    image.src=game.canvas.toDataURL('image/png');frame.after(image);
  });
};
document.getElementById('sword-play').onclick=e=>{swordPlaying=!swordPlaying;e.target.textContent=swordPlaying?'Pause':'Abspielen';};
document.getElementById('sword-frame').oninput=e=>{swordPlaying=false;swordElapsed=Number(e.target.value);document.getElementById('sword-play').textContent='Abspielen';};
document.getElementById('sword-direction').onclick=()=>{swordDirection*=-1;};
document.getElementById('training-test').onclick=async()=>{
 const passed=[],assert=(v,m)=>{if(!v)throw Error(m);passed.push('✓ '+m);status.textContent=passed.join('\n');};
 try{
  game.registry.get('saveData').settings.controlProfile='ipadKeyboard';await start('HammerTrainingScene');const s=current;
  s.beginDrill();await steps(2);
  assert(s.progressDots.length===3&&s.lessonTitle.text.startsWith('1 / 3'),'Drei Übungen: normal, voll aufgeladen, Sprung');
  assert(s.keyPanels[1].caps[0].wasPressed&&!s.keyPanels[0].caps[0].wasPressed,'Mucks echte Tastendrücke leuchten getrennt vom Spieler');
  key('Space');await steps(2);assert(s.keyPanels[0].caps[0].wasPressed,'Die eigene gedrückte Taste leuchtet ebenfalls');key('Space',false);
  await wait(()=>s.phase==='success','Normaler Schlag');assert(!s.mentor.hammerCharge.holding&&!s.mentor.isSwinging,'Mitmachen beendet Mucks Vorführung sofort');
  await wait(()=>s.drillIndex===1&&s.phase==='demo','Volle Ladung');
  let blueSeen=false,releasedSeen=false;const observe=()=>{blueSeen ||= s.keyPanels[1].caps[0].wasPressed&&s.keyPanels[1].hint.text.includes('Blau');releasedSeen ||= !s.mentor.hammerCharge.holding&&s.keyPanels[1].hint.text==='Loslassen!';};
  game.events.on('poststep',observe);
  await wait(()=>s.demoReleased,'Mucks volle Vorführung',6000);
  key('Space');await wait(()=>s.hammerCharge.elapsed>=1580,'Spieler lädt ganz auf',6000);key('Space',false);
  await wait(()=>s.phase==='success','Voller Hammerschlag');game.events.off('poststep',observe);
  assert(blueSeen&&releasedSeen,'Muck zeigt Halten bis Blau und anschließendes Loslassen');
  await wait(()=>s.drillIndex===2&&s.phase==='demo','Sprungschlag');await steps(2);
  assert(s.keyPanels[1].caps.length===2&&s.keyPanels[1].caps[0].wasPressed&&!s.keyPanels[1].caps[1].wasPressed,'Sprungtaste kommt vor der Abwärtstaste');
  game.registry.get('saveData').settings.controlProfile='ipadTouch';await steps(2);
  assert(s.keyPanels[0].caps[0].label.text==='Springen'&&s.keyPanels[0].caps[1].label.text==='Nach unten','Touch-Profil zeigt Aktionen ohne Tastaturbuchstaben');
  game.registry.get('saveData').settings.controlProfile='ipadKeyboard';await steps(2);
  await wait(()=>s.mentor.hammerSlamActive&&s.keyPanels[1].caps[1].wasPressed,'Mucks Abwärtstaste');
  assert(s.mentor.player.y<420,'Muck drückt erst in der Luft nach unten');
  key('ArrowUp');await steps(3);key('ArrowUp',false);await wait(()=>!s.player.body.blocked.down,'Spieler springt');
  key('ArrowDown');await steps(2);key('ArrowDown',false);
  await wait(()=>s.phase==='success','Sprunglandung');await wait(()=>s.isComplete,'Training fertig');
  assert(s.doneButton.visible&&s.keyPanels.every(p=>!p.container.visible),'Nach drei Treffern ist die Stunde fertig');
  assert(game.registry.get('saveData').tutorials.powerHammer.completed,'Trainingsabschluss wird gespeichert');
  key('Enter');key('Enter',false);await wait(()=>game.scene.isActive('UndergroundShopScene'),'Rückkehr nach Enter');
  assert(!win.motionErrors.length,'Keine Laufzeitfehler');
  status.textContent=passed.join('\n')+'\nDREI HAMMERÜBUNGEN BESTANDEN';
 }catch(e){release();key('Space',false);key('ArrowUp',false);key('ArrowDown',false);status.textContent=passed.join('\n')+'\nFEHLER: '+e.stack;}
};
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
        assert(Math.abs(width-50.4)<.001,`${expected}: horizontale Schwertreichweite beträgt 50,4`);
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
