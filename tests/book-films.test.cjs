const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const strip=source=>source.replace(/^import .*;\n/gm,'').replace(/export default class /g,'class ').replace(/export /g,'');
const book=vm.runInNewContext(strip(read('src/utils/bookTimeline.js'))+'\n({BOOK_FILMS,bookFilmFrame,bookDuration,bookShotStarts,jungleTreasureFrame,bookCoverCrop,bookIntroCredit,bookIntroMusicMix,bookDawnFrame});');
const gray=vm.runInNewContext(strip(read('src/utils/BookPresentation.js'))+'\ndesaturateBookPixels;');
const paper=vm.runInNewContext(strip(read('src/utils/BookPresentation.js'))+'\n({BOOK_PAGE_SHAPES,bookPagePoint,bookInkInset});');
const plain=value=>JSON.parse(JSON.stringify(value));

for(const film of Object.keys(book.BOOK_FILMS)){
  test(film+': each page uses one fixed camera for its complete shot',()=>{
    const starts=book.bookShotStarts(film),shots=book.BOOK_FILMS[film];
    for(let i=0;i<shots.length;i++){
      const view=plain(shots[i].view);
      for(let t=starts[i];t<starts[i]+shots[i].duration;t+=50){
        const f=book.bookFilmFrame(film,t),page=i%2?f.right:f.left;
        assert.equal(page.shot.id,shots[i].id);assert.deepEqual(plain(page.shot.view),view);
        assert.ok(Number.isFinite(page.time));assert.equal(page.desaturation,0);
      }
    }
  });
  test(film+': the previous page freezes and loses color; new shots begin on a blank page',()=>{
    const starts=book.bookShotStarts(film),shots=book.BOOK_FILMS[film];
    for(const t of [0,starts[1]-1,starts[2],starts[3]-1])assert.equal(book.bookFilmFrame(film,t).right,null);
    for(const rightIndex of [1,3]){
      for(const t of [starts[rightIndex]+800,starts[rightIndex]+1600]){
        const f=book.bookFilmFrame(film,t);
        assert.equal(f.left.time,shots[rightIndex-1].to);assert.equal(f.left.desaturation,.88);
        assert.equal(f.left.active,false);assert.equal(f.right.active,true);assert.equal(f.right.desaturation,0);
      }
    }
    const turn=book.bookFilmFrame(film,starts[2]-600);
    assert.equal(turn.left.time,shots[0].to);assert.equal(turn.right.time,shots[1].to);
    assert.equal(turn.next.time,shots[2].from);assert.equal(turn.sourceTime,shots[1].to);
    assert.equal(book.bookFilmFrame(film,book.bookDuration(film)-1).done,false);
    assert.equal(book.bookFilmFrame(film,book.bookDuration(film)).done,true);
  });
}
test('desaturation preserves transparency and luminance on browsers without canvas filters',()=>{
  const input=new Uint8ClampedArray([255,0,0,255,0,255,0,64,0,0,255,0,211,211,211,220]);
  gray(input);assert.deepEqual([...input],[54,54,54,255,182,182,182,64,18,18,18,0,211,211,211,220]);
});
test('printed pages meet their curved ink borders without folds or inverted image strips',()=>{
  for(const shape of Object.values(paper.BOOK_PAGE_SHAPES)){
    const corners=[shape.top[0],shape.top.at(-1),shape.bottom.at(-1),shape.bottom[0]];
    for(const [u,v,index] of [[0,0,0],[1,0,1],[1,1,2],[0,1,3]]){
      assert.deepEqual(plain(paper.bookPagePoint(shape,u,v)),plain(corners[index]));
    }
    const top=paper.bookPagePoint(shape,.5,0);
    assert.ok(top[1]<(corners[0][1]+corners[1][1])/2);
    for(let row=0;row<=10;row++)for(let col=0;col<20;col++){
      const v=row/10,u=col/20;
      const a=paper.bookPagePoint(shape,u,v),b=paper.bookPagePoint(shape,u+.05,v);
      assert.ok(b[0]>a[0]);
      assert.ok(a[0]>0&&a[0]<1586&&a[1]>0&&a[1]<992);
      if(row<10)assert.ok(paper.bookPagePoint(shape,u,(row+1)/10)[1]>a[1]);
    }
  }
});
test('every live shot fills a portrait page with uniform scaling, preserving actor proportions',()=>{
  for(const shots of Object.values(book.BOOK_FILMS))for(const shot of shots){
    if(!shot.view)continue;
    const [x,y,w,h]=book.bookCoverCrop(shot.view);
    assert.ok(Math.abs(600/w-720/h)<1e-9,'horizontal and vertical scale must be identical');
    assert.ok(x>=shot.view[0]&&y>=shot.view[1]);
    assert.ok(x+w<=shot.view[0]+shot.view[2]&&y+h<=shot.view[1]+shot.view[3]);
  }
});
test('intro credits fade out before freezing and use different positions',()=>{
  const first=book.bookIntroCredit(1500),second=book.bookIntroCredit(8500);
  assert.equal(first.alpha,1);assert.equal(second.alpha,1);
  assert.notEqual(first.x,second.x);assert.notEqual(first.y,second.y);
  for(const t of [0,3600,6199,10400,12799,22000])assert.equal(book.bookIntroCredit(t).alpha,0);
  assert.ok(book.bookIntroCredit(550).alpha>0&&book.bookIntroCredit(550).alpha<1);
  assert.ok(book.bookIntroCredit(10200).alpha>0&&book.bookIntroCredit(10200).alpha<1);
});
test('the jungle chest approaches, then floats beyond reach while both heroes stay on the bank',()=>{
  const a=book.jungleTreasureFrame(0),near=book.jungleTreasureFrame(6500),away=book.jungleTreasureFrame(20000);
  assert.ok(near.chest.x<a.chest.x&&near.chest.y>a.chest.y);
  assert.ok(away.chest.x>near.chest.x+150&&away.chest.y<near.chest.y-100);
  assert.ok(near.chest.size>away.chest.size);
  assert.equal(book.jungleTreasureFrame(2900).surprise,true);
  assert.ok(book.jungleTreasureFrame(9000).bubbles>0);
  for(const reduced of [false,true])for(let time=0;time<=20000;time+=50){
    const f=book.jungleTreasureFrame(time,reduced);
    assert.ok(f.helper.groundY>=400);assert.ok(f.helper.x<=705);
    assert.ok(f.hero.y>=450);assert.ok(f.hero.x<=610);
    for(const actor of [f.hero,f.helper,f.chest])assert.ok(Number.isFinite(actor.x)&&Number.isFinite(actor.y));
  }
  assert.equal(away.hero.pose,'point');
});

test('startup turns to a left-hand menu; a new game omits the moon and reveals the desert on the right',()=>{
 const startup=book.BOOK_FILMS.intro,adventure=book.BOOK_FILMS.adventure;
 assert.equal(startup[0].id,'moon');assert.equal(startup.at(-1).menu,true);
 assert.equal((startup.length-1)%2,0);assert.equal(adventure[0].id,'bedroom');
 assert.equal(adventure.at(-1).texture,'book-desert');assert.equal((adventure.length-1)%2,1);
 const at=book.bookShotStarts('intro')[4];
 const turning=book.bookFilmFrame('intro',at-600);
 assert.equal(turning.right.shot.id,'wake');assert.equal(turning.next.shot.menu,true);
 assert.equal(book.bookFilmFrame('intro',at).left.shot.menu,true);
});
test('sleep fades into the title theme at wake-up, never into a second sleep loop',()=>{
 assert.deepEqual(plain(book.bookIntroMusicMix(15000)),{sleep:.2,title:0});
 const middle=book.bookIntroMusicMix(18650);assert.equal(middle.sleep,.1);assert.equal(middle.title,.175);
 assert.deepEqual(plain(book.bookIntroMusicMix(20500)),{sleep:0,title:.35});
 for(const film of ['intro','adventure']){
  const i=book.BOOK_FILMS[film].findIndex(s=>s.id==='wake');
  const f=book.bookFilmFrame(film,book.bookShotStarts(film)[i]+8000);
  assert.equal(book.bookIntroMusicMix(f.sourceTime).sleep,0);
 }
});
test('dry-brush edges are narrow, irregular, and fixed to the page',()=>{
 for(let edge=0;edge<4;edge++){
  const values=Array.from({length:300},(_,i)=>paper.bookInkInset(i/299,edge));
  assert.ok(Math.min(...values)>=2.5&&Math.max(...values)<=6.7);
  assert.ok(Math.max(...values)-Math.min(...values)>3);
  assert.deepEqual(values,Array.from({length:300},(_,i)=>paper.bookInkInset(i/299,edge)));
 }
});

test('credits are painted in the startup intro, but never in the new-game film',()=>{
  const Shots=vm.runInNewContext(strip(read('src/utils/BookShots.js'))+'\nBookShots;',{
    bookCoverCrop:book.bookCoverCrop,bookIntroCredit:book.bookIntroCredit,
  });
  const renderer=Object.create(Shots.prototype),painted=[];
  const context={clearRect(){},drawImage(){},save(){},restore(){},strokeText(){},
    fillText(text){painted.push(text)}};
  Object.assign(renderer,{c:context,raw:{},intro(){}});
  const target={width:600,height:720,getContext:()=>context};
  for(const film of ['intro','adventure']){
    painted.length=0;
    for(const time of [1500,8500])renderer.render(target,film,{
      shot:{view:[220,0,500,600]},time,
    });
    assert.deepEqual(painted,film==='intro'?['Spielidee von Brucy','Entwickelt mit Onkel Tim']:[]);
  }
});

test('a page remains fully visible when it settles after every turn',()=>{
 for(const film of Object.keys(book.BOOK_FILMS)){
  const starts=book.bookShotStarts(film);
  for(let i=2;i<starts.length;i+=2){
   const before=book.bookFilmFrame(film,starts[i]-1);
   assert.equal(before.next.reveal,1);
   for(const offset of [0,1,16,33,100,300]){
    const after=book.bookFilmFrame(film,starts[i]+offset);
    assert.equal(after.left.reveal,1,film+': the settled page must not fade out and back in');
   }
  }
 }
});

test('the window scene advances from a starry night to full daylight before freezing',()=>{
 const shot=book.BOOK_FILMS.intro[0],night=book.bookDawnFrame(shot.from),day=book.bookDawnFrame(shot.to);
 assert.equal(shot.opening,true);assert.equal(night.starsAlpha,1);assert.equal(night.sun.alpha,0);
 assert.equal(night.moon.alpha,1);assert.equal(day.starsAlpha,0);assert.equal(day.moon.alpha,0);
 assert.equal(day.sun.alpha,1);assert.equal(day.day,1);assert.ok(day.sun.y<night.sun.y);
 assert.ok(day.skyTop[2]>night.skyTop[2]);assert.ok(day.skyHorizon[0]>night.skyHorizon[0]);
 let previous=night;
 for(let time=shot.from;time<=shot.to;time+=25){
  const frame=book.bookDawnFrame(time);
  assert.ok(frame.starsAlpha<=previous.starsAlpha);assert.ok(frame.sun.y<=previous.sun.y);
  assert.ok(frame.day>=previous.day);previous=frame;
 }
 assert.deepEqual(plain(book.bookDawnFrame(shot.to)),plain(book.bookDawnFrame(0)));
});

test('dawn fades the moon in place and lets the sun emerge close to the mountain ridge',()=>{
 const shot=book.BOOK_FILMS.intro[0],first=book.bookDawnFrame(shot.from),last=book.bookDawnFrame(shot.to);
 for(let time=shot.from;time<=shot.to;time+=16){
  const frame=book.bookDawnFrame(time);
  assert.equal(frame.moon.x,first.moon.x);assert.equal(frame.moon.y,first.moon.y);
  assert.ok(frame.sun.y>=last.sun.y&&frame.sun.y<=first.sun.y);
  assert.ok(frame.sun.x>=first.sun.x&&frame.sun.x<=last.sun.x);
  assert.ok(frame.moon.alpha<.2||frame.sun.alpha<.2,'The two bright discs do not compete during dawn.');
 }
 assert.ok(first.sun.y-last.sun.y<.06,'The sun rises a short distance at the horizon.');
 assert.ok(last.sun.y>.62&&last.sun.y<.65,'The final sun stays on the painted ridge, not high in the sky.');
 assert.equal(last.moon.alpha,0);assert.equal(last.sun.alpha,1);
});
