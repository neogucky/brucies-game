import { defaultSave } from '../../src/saveManager.js';
import { BOOK_FILMS, bookFilmFrame, bookDuration, bookShotStarts } from '../../src/utils/bookTimeline.js';

const frame=document.getElementById('game-frame'),root=new URL('../../',location.href).href;
const play=document.getElementById('play'),replay=document.getElementById('replay'),seek=document.getElementById('seek');
const clock=document.getElementById('clock'),status=document.getElementById('status'),loading=document.getElementById('loading');
let chapters=[];
const chapterNav=document.getElementById('chapters'),films=[...document.querySelectorAll('[data-film]')];
const labels={moon:'Mondnacht',bedroom:'Schlafzimmer',exterior:'Der Drache',wake:'Aufwachen',
  'menu-title':'Hauptmenü','desert-title':'Wüstenwelt',walk:'Wanderung',tracks:'Die Spur',cave:'Zur Höhle',
  'underworld-title':'Untergrundwelt',find:'Der Fund',read:'Das Prospekt',passage:'Der Durchgang',
  'jungle-title':'Urwaldwelt',treasure:'Die Truhe',reach:'Fast erreicht',drift:'Hinaus auf den See','water-title':'Wasserwelt'};
let moments=[];
function makeChapters(){
  const starts=bookShotStarts(film);moments=[];chapterNav.replaceChildren();
  BOOK_FILMS[film].forEach((shot,i)=>{
    if(i>0&&i%2===0)moments.push({label:'Umblättern',time:starts[i]-600,index:i-1,turn:true});
    moments.push({label:labels[shot.id],time:starts[i]+Math.min(1200,shot.duration-1),index:i,turn:false});
  });
  chapters=moments.map(m=>{
    const button=document.createElement('button');button.textContent=m.label;
    button.addEventListener('click',()=>jump(m.time));chapterNav.append(button);return button;
  });
}
function momentIndex(f){return moments.findIndex(m=>m.index===f.index&&m.turn===(f.turn!==null));}

let game,scene,film=Object.hasOwn(BOOK_FILMS,new URLSearchParams(location.search).get('film'))
  ?new URLSearchParams(location.search).get('film'):'intro',ready=false,opening=false;
const wait=async condition=>{const start=performance.now();while(!condition()){
  if(performance.now()-start>45000)throw new Error('Das Buch konnte nicht geladen werden.');
  await new Promise(resolve=>requestAnimationFrame(resolve));
}};
function times(){return moments.map(m=>m.time);}
function paused(){return !scene?.started||scene.suspended;}
function toggle(){if(!ready)return;if(paused()){if(scene.elapsed>=scene.duration)scene.elapsed=0;scene.startIntro();}else scene.suspendIntro();updateUI();}
function jump(time){if(!ready)return;scene.suspendIntro();scene.elapsed=Math.max(0,Math.min(scene.duration,time));scene.drawFrame();updateUI();}
function restart(){if(!ready)return;scene.elapsed=0;scene.drawFrame();scene.startIntro();updateUI();}
function updateUI(){
  if(!ready)return;
  const f=bookFilmFrame(film,scene.elapsed),index=momentIndex(f);
  play.textContent=paused()?'Abspielen':'Pause';play.setAttribute('aria-pressed',String(!paused()));
  seek.value=String(Math.round(scene.elapsed));seek.max=String(scene.duration);
  const format=t=>Math.floor(t/60000)+':'+String(Math.floor(t/1000)%60).padStart(2,'0');
  clock.textContent=format(scene.elapsed)+' / '+format(scene.duration);seek.setAttribute('aria-valuetext',Math.floor(scene.elapsed/1000)+' Sekunden');
  chapters.forEach((button,i)=>{button.textContent=moments[i].label;button.setAttribute('aria-current',i===index?'step':'false');});
  films.forEach(button=>button.setAttribute('aria-current',button.dataset.film===film?'step':'false'));
  const message=moments[index]?.label+(paused()?' · pausiert':' · läuft');if(status.textContent!==message)status.textContent=message;
}
async function showFilm(id){
  if(opening)return;opening=true;ready=false;film=id;makeChapters();
  try{
    game.scene.getScenes(true).forEach(s=>game.scene.stop(s.sys.settings.key));
    game.registry.set('storyPreview',{filmIds:[film],index:0,returnScene:'MainMenuScene'});
    const isIntro=film==='intro'||film==='adventure';
    const key=isIntro?'IntroScene':'DragonClueScene';game.scene.start(key,isIntro?{mode:film==='adventure'?'newGame':'startup'}:{world:film});
    await wait(()=>game.portableControls.activeScene()?.sys.settings.key===key&&game.scene.getScene(key).book);
    scene=game.scene.getScene(key);
    // Only this isolated viewer holds the last frame for inspection. The game
    // itself keeps its real automatic endings and normal save routing.
    scene.finish=()=>{scene.elapsed=scene.duration;scene.suspendIntro();scene.drawFrame();updateUI();};
    ready=true;[play,replay,seek,...chapters,...films].forEach(button=>button.disabled=false);
    loading.hidden=true;updateUI();
  }finally{opening=false;}
}
async function start(){
  [play,replay,seek,...chapters,...films].forEach(button=>button.disabled=true);
  const html=await(await fetch(root+'index.html',{cache:'no-store'})).text();
  const seed=structuredClone(defaultSave);
  const instrumentation=`<script>
    const memory=new Map([['brucies_game_save_v1',${JSON.stringify(JSON.stringify(seed))}]]);
    Object.defineProperty(window,'localStorage',{value:{getItem:k=>memory.get(k)??null,
      setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),clear:()=>memory.clear()}});
    const RealGame=Phaser.Game;Phaser.Game=class extends RealGame{constructor(config){super(config);window.bookPreviewGame=this;}};
    window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();e.stopImmediatePropagation();
      if(!e.repeat)parent.postMessage({bookPreviewAction:'toggle'},location.origin);}},true);
  </script>`;
  const fit='<style>html,body,#play-shell{height:100%;min-height:0;background:transparent!important}#play-shell{padding:0!important}body{padding:0!important;display:block!important}#play-shell,#game{width:100%!important;height:100%!important;max-width:none!important;border:0!important;box-shadow:none!important}html{background:#211c18!important}#game-controls{display:none!important}</style>';
  frame.srcdoc=html.replace('<head>','<head><base href="'+root+'">'+fit)
    .replace('<!-- Version local modules',instrumentation+'\n<!-- Version local modules');
  await wait(()=>frame.contentWindow?.bookPreviewGame?.portableControls?.activeScene()?.book);
  game=frame.contentWindow.bookPreviewGame;await showFilm(film);
  const loop=()=>{updateUI();requestAnimationFrame(loop);};requestAnimationFrame(loop);
}
play.addEventListener('click',toggle);replay.addEventListener('click',restart);
seek.addEventListener('input',()=>jump(Number(seek.value)));

films.forEach(button=>button.addEventListener('click',()=>showFilm(button.dataset.film)));
window.addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.origin===location.origin&&e.data?.bookPreviewAction==='toggle')toggle();});
document.addEventListener('keydown',e=>{
  if(!ready||e.target instanceof HTMLInputElement)return;
  if(e.code==='Space'){e.preventDefault();if(!e.repeat)toggle();}
  if(e.code==='ArrowLeft'||e.code==='ArrowRight'){
    e.preventDefault();if(e.repeat)return;
    const f=bookFilmFrame(film,scene.elapsed),i=momentIndex(f);
    jump(times()[Math.max(0,Math.min(moments.length-1,i+(e.code==='ArrowRight'?1:-1)))]);
  }
});
start().catch(error=>{loading.textContent=error.message;status.textContent=error.message;console.error(error);});
