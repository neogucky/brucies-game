import { getIntroFrame, INTRO_FLOOR_LIGHT, INTRO_EXTERIOR_FOREGROUND } from './introTimeline.js';
import { dragonClueFrame, DRAGON_TRACKS } from './dragonStory.js';
import { jungleTreasureFrame, bookCoverCrop, bookIntroCredit } from './bookTimeline.js';

export const createBookCanvas = (width, height) => Object.assign(document.createElement('canvas'), { width, height });
function polygon(c, points) {
  c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath();
}

export default class BookShots {
  constructor(getImage, { reducedMotion = false, female = false } = {}) {
    this.image = getImage; this.reducedMotion = reducedMotion; this.female = female;
    this.raw = createBookCanvas(960, 600); this.c = this.raw.getContext('2d'); this.tinted = new Map();
  }
  sprite(key, x, y, width, height, { angle = 0, alpha = 1, flip = false, ox = .5, oy = 1 } = {}) {
    if (alpha <= 0) return;
    const c = this.c; c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(angle * Math.PI / 180);
    if (flip) c.scale(-1, 1);
    c.drawImage(this.image(key), -width * ox, -height * oy, width, height); c.restore();
  }
  ellipse(x, y, rx, ry, alpha = .2, color = '#302216') {
    const c = this.c; c.save(); c.globalAlpha = alpha; c.fillStyle = color;
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); c.restore();
  }
  intro(time) {
    const c = this.c, f = getIntroFrame(time, this.reducedMotion), outside = f.stage === 'exterior';
    // The fixed portrait shot keeps the bed and window ledge in one view.
    // Re-stage the helper's short path, retaining his size and landing height.
    if(time>=4200&&time<6200)f.helper.x=665+(f.helper.x-665)*5/99;
    if(time>=12800&&time<14400)f.helper.x=465+(f.helper.x-465)*205/299;
    if(time>=20300)f.helper.x=430+(f.helper.x-430)*235/265;
    if(outside)f.dragon.x=-200+(f.dragon.x+260)*950/1510;
    c.drawImage(this.image(outside ? 'intro-exterior' : 'intro-bedroom'), 0, 0, 960, 600);
    if (outside) {
      this.sprite('intro-dragon-' + f.dragon.frame, f.dragon.x, f.dragon.y, f.dragon.width, f.dragon.height, { oy: .5 });
      c.save(); c.font = '18px Georgia'; c.textAlign = 'center';
      for (let i = 0; i < 12; i++) {
        const p = (f.time / 1100 + i / 12) % 1;
        c.fillStyle = i % 2 ? '#ffdf80' : '#e6f5ff'; c.globalAlpha = (1 - p) * .8;
        c.fillText('✦', f.dragon.x - 115 - p * 135, f.dragon.y + 77 + Math.sin(i * 8 + p * 4) * 26);
      }
      c.restore();
      for (const points of INTRO_EXTERIOR_FOREGROUND) {
        c.save(); polygon(c, points); c.clip(); c.drawImage(this.image('intro-exterior'), 0, 0, 960, 600); c.restore();
      }
    } else {
      if (f.shadow.alpha > 0) {
        const key = 'intro-dragon-' + f.shadow.frame;
        if (!this.tinted.has(key)) {
          const image = this.image(key), shadow = createBookCanvas(image.width, image.height), s = shadow.getContext('2d');
          s.drawImage(image, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = '#101827'; s.fillRect(0, 0, shadow.width, shadow.height); this.tinted.set(key, shadow);
        }
        c.save(); polygon(c, INTRO_FLOOR_LIGHT); c.clip(); c.globalAlpha = f.shadow.alpha;
        c.translate(f.shadow.x, f.shadow.y); c.rotate(f.shadow.angle * Math.PI / 180);
        c.drawImage(this.tinted.get(key), -f.shadow.width / 2, -f.shadow.height / 2, f.shadow.width, f.shadow.height); c.restore();
      }
      c.drawImage(this.image('intro-bed-ground-shadow'), 0, 0);
      c.drawImage(this.image('intro-bed-fixed'), 0, 0);
      const pose = a => this.sprite('intro-hero-' + a.pose, a.x, a.y, 440 * a.scaleX, 360 * a.scaleY, { angle: a.angle, ox: 260 / 440 });
      if (f.occupant.visible) pose(f.occupant);
      if (f.knight.visible && f.knight.behindBed) pose(f.knight);
      if (f.blanket.empty > 0) c.drawImage(this.image('intro-blanket-empty'), 0, 0);
      c.save(); c.globalAlpha = 1 - f.blanket.empty;
      c.drawImage(this.image('intro-blanket-occupied'), 0, 600 - 600 * f.blanket.scaleY, 960, 600 * f.blanket.scaleY); c.restore();
      c.drawImage(this.image('intro-bed-front'), 0, 0);
      this.ellipse(f.helper.x, f.helper.groundY + 1, 35, 6.5, .23);
      if (f.knight.visible) {
        this.ellipse(f.knight.x, (f.knight.groundY || 535) + 3, 61, 9.5);
        if (!f.knight.behindBed) pose(f.knight);
      }
    }
    this.sprite('intro-helper-' + f.helper.pose, f.helper.x, f.helper.y, 89 / f.helper.stretch, 92 * f.helper.stretch);
    f.sleepSymbols.forEach((z, i) => {
      if (z.alpha <= 0) return;
      c.save(); c.globalAlpha = z.alpha; c.translate(z.x, z.y); c.scale(z.scale, z.scale);
      c.font = 'bold ' + (23 + i * 4) + 'px Georgia'; c.fillStyle = '#d5efff'; c.strokeStyle = '#23405c';
      c.lineWidth = 3; c.strokeText(i === 2 ? 'Z' : 'z', 0, 0); c.fillText(i === 2 ? 'Z' : 'z', 0, 0); c.restore();
    });
    if (f.helperSurprised) this.exclamation(f.helper.x, f.helper.y - 116);
  }
  exclamation(x, y) {
    const c = this.c; c.save(); c.textAlign = 'center'; c.font = 'bold 36px "Trebuchet MS", sans-serif';
    c.lineJoin = 'round'; c.lineWidth = 5; c.strokeStyle = '#fff2d1'; c.fillStyle = '#e9382d';
    c.strokeText('!', x, y); c.fillText('!', x, y); c.restore();
  }
  footprints(closeup) {
    const c = this.c;
    DRAGON_TRACKS.desert.forEach(([x, y], i) => {
      c.save(); c.translate(x, y); c.rotate((35 + (i % 2 ? 10 : -10)) * Math.PI / 180);
      c.scale(.82 - i * .055, .82 - i * .055); c.globalAlpha = closeup ? .5 : .18; c.fillStyle = '#77512d';
      for (const [cx,cy,rx,ry] of [[0,5,17.5,14.5],[-15,-12,6,9.5],[0,-19,6.5,10.5],[15,-12,6,9.5]]) {
        c.beginPath(); c.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); c.fill();
      }
      c.fillStyle = '#56351c';
      for (const p of [[-19,-16,-14,-28,-10,-15],[-5,-24,0,-36,5,-24],[10,-15,14,-28,19,-16]]) {
        c.beginPath(); c.moveTo(p[0],p[1]); c.lineTo(p[2],p[3]); c.lineTo(p[4],p[5]); c.closePath(); c.fill();
      }
      c.restore();
    });
  }
  actors(f) {
    const hs = 118 - (535 - f.hero.y) * .18, cs = 74 - (510 - f.helper.groundY) * .1;
    this.ellipse(f.hero.x,f.hero.y-2,hs*.26,hs*.045,.22*(f.hero.opacity??1));
    this.ellipse(f.helper.x,f.helper.groundY-2,cs*.26,cs*.045,.22*(f.helper.opacity??1));
    const heroKey = f.hero.pose ? 'story-hero-' + f.hero.pose : f.hero.walking
      ? 'knight' + (this.female ? '-female' : '') + '-walk-' + Math.floor(f.time / 125) % 6 : 'story-hero-quiet';
    const heroY = f.hero.y - (f.hero.walking ? Math.abs(Math.sin(f.time / 130)) * 2 : 0);
    this.sprite(heroKey,f.hero.x,heroY,hs,hs,{angle:f.hero.angle,alpha:(f.hero.opacity??1)*(1-(f.hero.blend||0))});
    if(f.hero.nextPose)this.sprite('story-hero-'+f.hero.nextPose,f.hero.x,heroY,hs,hs,{alpha:f.hero.blend||0});
    const pose=f.helper.pose||(f.surprise?'peek':f.helper.hopping||f.beat==='follow'?'hop':'awake');
    this.sprite((['observe','beckon','point'].includes(pose)?'story-helper-':'intro-helper-')+pose,
      f.helper.x,f.helper.y,cs/f.helper.stretch,cs*f.helper.stretch,
      {angle:f.helper.angle,flip:f.helper.flipX,alpha:f.helper.opacity});
    if(f.surprise)this.exclamation(f.helper.x,f.helper.y-cs-13);
  }
  clue(world, time, shot) {
    const c=this.c;
    const jungle=world==='jungle',f=jungle?jungleTreasureFrame(time,this.reducedMotion):dragonClueFrame(world,time,this.reducedMotion);
    c.drawImage(this.image(jungle?'book-shore':world==='desert'?'story-desert':'story-underground'),0,0,960,600);
    if(world==='desert')this.footprints(shot.id==='tracks');
    if(world==='underground'&&f.groundBrochure){
      c.save();c.translate(596,475);c.rotate(-12*Math.PI/180);c.fillStyle='#fff0c7';c.fillRect(-18,-9,36,18);
      c.drawImage(this.image('worldmap-jungle-bg'),-13.5,-5,27,10);c.restore();
    }
    if(jungle){
      this.sprite('chest-closed',f.chest.x,f.chest.y,f.chest.size,f.chest.size*.78,{angle:f.chest.angle,oy:.88});
      c.save();c.strokeStyle='#c8f6ff';c.lineWidth=1.8;
      for(let i=0;i<3;i++){
        const p=(time/1800+i/3)%1;c.globalAlpha=(1-p)*.55;
        c.beginPath();c.ellipse(f.chest.x,f.chest.y,20+p*35,3+p*9,0,0,Math.PI*2);c.stroke();
        if(f.bubbles>0){
          c.globalAlpha=(1-p)*f.bubbles*.75;
          const x=f.chest.x+24+i*11,y=f.chest.y+8-p*36;
          c.beginPath();c.arc(x,y,2+p*5,0,Math.PI*2);c.stroke();
        }
      }
      c.restore();
    }
    this.actors(f);
  }
  render(target, film, page) {
    const c=target.getContext('2d'),w=target.width,h=target.height,{shot,time}=page;
    c.clearRect(0,0,w,h);
    if(shot.texture){
      const image=this.image(shot.texture),crop=bookCoverCrop([0,0,image.width,image.height],w,h);
      c.drawImage(image,...crop,0,0,w,h);return;
    }
    // The menu is printed onto a whole turning sheet by BookPresentation.
    if(shot.menu)return;
    this.c.clearRect(0,0,960,600);
    if((film==='intro'||film==='adventure'))this.intro(time);else this.clue(film,time,shot);
    const [x,y,width,height]=bookCoverCrop(shot.view,w,h);
    // Print right to the inked page boundary. The paper renderer bends this
    // complete image with the page; the narrow dry-brush edge is added by the paper renderer.
    c.drawImage(this.raw,x,y,width,height,0,0,w,h);
    const credit=film==='intro'?bookIntroCredit(time):null;
    if(credit?.alpha>0){
      c.save();c.globalAlpha=credit.alpha;
      c.font='bold 27px Georgia, serif';c.fillStyle='#fff1cf';c.textAlign=credit.align;
      c.strokeStyle='#253e48';c.lineWidth=5;c.lineJoin='round';
      c.strokeText(credit.text,credit.x,credit.y);c.fillText(credit.text,credit.x,credit.y);c.restore();
    }
  }
}
