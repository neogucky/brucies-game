const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function fixture(){
 const music=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/soundManager.js'),'utf8').replace(/export /g,'')+'\n({playMusic,stopMusic,setMusicVolume,pauseMusic,resumeMusic});');
 const voices=[];
 const scene={sound:{add(key,options){
  const voice={key,...options,isPlaying:false,isPaused:false,starts:0,
   play(){this.isPlaying=true;this.isPaused=false;this.starts++},
   pause(){this.isPlaying=false;this.isPaused=true},resume(){this.isPlaying=true;this.isPaused=false},
   stop(){this.isPlaying=false},destroy(){this.destroyed=true},
   setRate(rate){this.rate=rate},setVolume(volume){this.volume=volume}};
  voices.push(voice);return voice;
 }}};
 return {music,scene,voices};
}
test('the title track survives intro → menu at the same position and full menu volume',()=>{
 const {music,scene,voices}=fixture();music.playMusic(scene,'music-menu',{volume:0});
 music.setMusicVolume(.175);assert.equal(voices[0].volume,.175);
 music.pauseMusic();music.resumeMusic();music.setMusicVolume(.35);
 music.playMusic(scene,'music-menu',{volume:.35});
 assert.equal(voices.length,1);assert.equal(voices[0].starts,1);assert.equal(voices[0].volume,.35);
 assert.equal(voices[0].destroyed,undefined);
 music.playMusic(scene,'music-desert');assert.equal(voices[0].destroyed,true);assert.equal(voices.length,2);
});
test('a paused title track resumes on menu entry rather than creating a second track',()=>{
 const {music,scene,voices}=fixture();music.playMusic(scene,'music-menu',{volume:.1});music.pauseMusic();
 music.playMusic(scene,'music-menu',{volume:.35});
 assert.equal(voices.length,1);assert.equal(voices[0].starts,1);assert.equal(voices[0].isPlaying,true);
 assert.equal(voices[0].volume,.35);music.stopMusic();assert.equal(voices[0].destroyed,true);
});

test('new-game wake-up uses desert music and hands that same track to the desert map',()=>{
 const {music,scene,voices}=fixture();
 const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
 const bookIntroMusicMix=vm.runInNewContext(read('src/utils/bookTimeline.js').replace(/export /g,'')+'\nbookIntroMusicMix;');
 const context=vm.createContext({...music,bookIntroMusicMix,Phaser:{Scene:class{}},advanceStoryPreview:()=>false});
 vm.runInContext(read('src/scenes/IntroScene.js').replace(/^import .*;\n/gm,'')
  .replace('export default class IntroScene','globalThis.Intro=class IntroScene'),context);
 const intro=new context.Intro(),destinations=[];
 Object.assign(intro,{newGame:true,sound:scene.sound,audio:{setMusicVolume(){},destroy(){}},
  scene:{start:key=>destinations.push(key)}});
 intro.updateMusic(20500);
 assert.equal(voices.length,1);assert.equal(voices[0].key,'music-desert');
 intro.finish();assert.deepEqual(destinations,['DessertMapScene']);
 music.playMusic(scene,'music-desert');assert.equal(voices.length,1);assert.equal(voices[0].starts,1);
});
