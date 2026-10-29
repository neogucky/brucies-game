import { playMusic } from '../soundManager.js';
import { profileForScene } from '../utils/controlProfiles.js';
import { unlockedStoryFilms, startStoryPreview } from '../utils/storyPreview.js';
import { bookPaperRenderer, BOOK_PAGE_SHAPES, bookPagePoint } from '../utils/BookPresentation.js';
import { createBookCanvas } from '../utils/BookShots.js';
import { bookCoverCrop } from '../utils/bookTimeline.js';

const textStyle = { fontFamily: 'Trebuchet MS, sans-serif', color: '#173d42' };

export default class CinemaScene extends Phaser.Scene {
  constructor() { super({ key: 'CinemaScene' }); }
  init(data) { this.selectedFilmId = data?.selectedFilmId; }

  create() {
    this.films = unlockedStoryFilms(this.registry.get('saveData') || {}, this.registry.get('unlockAllForTesting'));
    this.cards = []; this.allFrame = null; this.allText = null; this.showingFilm = false;
    this.selectedIndex = this.selectedFilmId === 'all' && this.films.length > 1 ? this.films.length
      : Math.max(0, this.films.findIndex(film => film.id === this.selectedFilmId));
    this.addBackground();
    this.add.text(480, 59, 'Kino', { ...textStyle, fontFamily: 'Georgia, serif', fontStyle: 'bold', fontSize: '40px' }).setOrigin(.5);
    this.add.text(120, 59, 'Zurück · {back}', { ...textStyle, fontSize: '19px', padding: { x: 16, y: 13 }, backgroundColor: '#213d49' })
      .setOrigin(.5).setColor('#fff1d0').setInteractive({ useHandCursor: true }).on('pointerdown', () => this.back());
    this.films.forEach((film, index) => {
      this.addFilmCard(film, index);
    });
    if (this.films.length > 1) {
      this.allFrame = this.add.graphics();
      this.allText = this.add.text(480, 550, 'Alle ansehen', { ...textStyle, fontSize: '21px' }).setOrigin(.5);
      this.add.zone(480, 550, 226, 40).setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.select(this.films.length)).on('pointerdown', () => this.playAll());
    } else this.add.text(710, 300, 'Weitere Filme schaltest du beim Spielen frei.', { ...textStyle,
      fontSize: '23px', color: '#654c32', align: 'center', wordWrap: { width: 260 } }).setOrigin(.5);
    const touch = profileForScene(this) === 'ipadTouch';
    const hint = touch ? 'Film antippen' : this.films.length > 1 ? '{move}: Wählen · Ansehen · {confirm}' : 'Ansehen · {confirm}';
    this.add.text(480, this.allText ? 584 : 555, hint,
      { ...textStyle, fontSize: '16px', color: '#fff1d0', stroke: '#34251d', strokeThickness: 3 }).setOrigin(.5);
    this.input.keyboard.on('keydown-LEFT', () => this.moveSelection(-1, 0));
    this.input.keyboard.on('keydown-RIGHT', () => this.moveSelection(1, 0));
    this.input.keyboard.on('keydown-UP', () => this.moveSelection(0, -1));
    this.input.keyboard.on('keydown-DOWN', () => this.moveSelection(0, 1));
    this.input.keyboard.on('keydown-ENTER', () => this.activateSelection());
    this.input.keyboard.on('keydown-ESC', () => this.back());
    this.input.keyboard.on('keydown-F', () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen(); });
    this.events.once('shutdown', () => { if(this.textures.exists(this.bookTextureKey))this.textures.remove(this.bookTextureKey); });
    this.updateSelection(); playMusic(this, 'music-menu');
  }

  addBackground() {
    this.bookTextureKey='cinema-book-spread';
    if(this.textures.exists(this.bookTextureKey))this.textures.remove(this.bookTextureKey);
    this.bookTexture=this.textures.createCanvas(this.bookTextureKey,1586,992);
    this.bookCanvas=this.bookTexture.getSourceImage();this.bookContext=this.bookCanvas.getContext('2d');
    this.paper=bookPaperRenderer(this.bookContext);
    this.pageCanvases=[createBookCanvas(600,720),createBookCanvas(600,720)];
    this.add.image(480,300,this.bookTextureKey).setDisplaySize(960,600);
  }

  addFilmCard(film,index) {
    const side=Math.floor(index/2),row=index%2,y=78+row*306;
    const shape=side?BOOK_PAGE_SHAPES.right:BOOK_PAGE_SHAPES.left;
    const points=[[.025,y/720],[.975,y/720],[.975,(y+276)/720],[.025,(y+276)/720]]
      .map(([u,v])=>bookPagePoint(shape,u,v)).map(([x,y])=>[x*960/1586,y*600/992]);
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top;
    const zone=this.add.zone(left+width/2,top+height/2,width,height).setInteractive({useHandCursor:true})
      .on('pointerover',()=>this.select(index)).on('pointerdown',()=>this.playFilm(film.id));
    this.cards.push({film,index,side,row,y,zone});
  }

  paintSpread() {
    const c=this.bookContext;c.clearRect(0,0,1586,992);
    c.drawImage(this.textures.get('book-open').getSourceImage(),0,0,1586,992);
    this.pageCanvases.forEach((page,side)=>{
      const p=page.getContext('2d');p.clearRect(0,0,600,720);
      // Reuse the book's own unmarked parchment beneath the printed cards.
      p.drawImage(this.textures.get('book-open').getSourceImage(),960,230,360,450,0,0,600,720);
      for(const card of this.cards.filter(card=>card.side===side)){
        const selected=card.index===this.selectedIndex,{y,film}=card;
        p.fillStyle=selected?'#efd39e':'#ffefce';p.fillRect(10,y-10,580,276);
        p.strokeStyle=selected?'#275459':'#c2a16c';p.lineWidth=selected?4:1.5;p.strokeRect(10,y-10,580,276);
        const image=this.textures.get(film.thumbnail).getSourceImage();
        p.drawImage(image,...bookCoverCrop([0,0,image.width,image.height],560,198),20,y,560,198);
        p.fillStyle='#173d42';p.font='bold '+(film.title.length>23?29:34)+'px Trebuchet MS, sans-serif';
        p.textAlign='left';p.textBaseline='middle';p.fillText(film.title,27,y+230,505);
        p.fillStyle=selected?'#275459':'#a47b42';p.beginPath();p.moveTo(546,y+217);
        p.lineTo(546,y+243);p.lineTo(565,y+230);p.closePath();p.fill();
      }
      this.paper.quad(page,side?BOOK_PAGE_SHAPES.right:BOOK_PAGE_SHAPES.left);
    });
    this.bookTexture.refresh();
  }

  select(index) {
    if (this.showingFilm) return;
    this.selectedIndex = index; this.updateSelection();
  }
  moveSelection(dx, dy) {
    if (this.showingFilm) return;
    const count = this.films.length, index = this.selectedIndex;
    if (index === count) { this.select(dy < 0 || dx < 0 ? count - 1 : 0); return; }
    const columns=Math.ceil(count/2),column=Math.floor(index/2),row=index%2;
    if(dx){
      if(columns>1)this.select(Math.min(count-1,((column+dx+columns)%columns)*2+row));
      return;
    }
    const next=index+dy;
    if(dy>0&&(row===1||next>=count)){if(this.allText)this.select(count);}
    else if(row+dy>=0&&row+dy<2&&next>=0&&next<count)this.select(next);
  }

  updateSelection() {
    this.paintSpread();
    if (this.allFrame) {
      const selected = this.selectedIndex === this.films.length;
      this.allFrame.clear().fillStyle(selected ? 0x53634e : 0x28434b).fillRoundedRect(367, 530, 226, 40, 9)
        .lineStyle(selected ? 2 : 1, selected ? 0xf1d294 : 0x718577).strokeRoundedRect(367, 530, 226, 40, 9);
      this.allText.setColor(selected ? '#ffe2a1' : '#fff1d0');
    }
    const selected = this.films[this.selectedIndex]?.title || 'Alle ansehen';
    this.accessibilityLabel = 'Kino. Filme: ' + this.films.map(film => film.title).join(', ') + '. Auswahl: ' + selected;
  }
  activateSelection() {
    if (this.selectedIndex === this.films.length) this.playAll();
    else this.playFilm(this.films[this.selectedIndex]?.id);
  }
  playFilm(id) {
    if (this.showingFilm || !this.films.some(film => film.id === id)) return;
    this.showingFilm = true;
    startStoryPreview(this, { filmIds: [id], returnScene: 'CinemaScene', selectedFilmId: id });
  }
  playAll() {
    if (this.showingFilm) return; this.showingFilm = true;
    startStoryPreview(this, { filmIds: this.films.map(film => film.id), returnScene: 'CinemaScene', selectedFilmId: 'all' });
  }
  back() { if (!this.showingFilm) this.scene.start('MainMenuScene', { selectedMenu: 'cinema' }); }
}
