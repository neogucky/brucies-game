import { playMusic } from '../soundManager.js';
import { profileForScene } from '../utils/controlProfiles.js';
import { unlockedStoryFilms, startStoryPreview } from '../utils/storyPreview.js';

const textStyle = { fontFamily: 'Trebuchet MS, sans-serif', color: '#fff1d0' };

export default class CinemaScene extends Phaser.Scene {
  constructor() { super({ key: 'CinemaScene' }); }
  init(data) { this.selectedFilmId = data?.selectedFilmId; }

  create() {
    this.films = unlockedStoryFilms(this.registry.get('saveData') || {}, this.registry.get('unlockAllForTesting'));
    this.cards = []; this.masks = []; this.maskShapes = []; this.showingFilm = false;
    this.selectedIndex = this.selectedFilmId === 'all' && this.films.length > 1 ? this.films.length
      : Math.max(0, this.films.findIndex(film => film.id === this.selectedFilmId));
    this.addBackground();
    this.add.text(480, 59, 'Kino', { ...textStyle, fontFamily: 'Georgia, serif', fontStyle: 'bold', fontSize: '40px' }).setOrigin(.5);
    this.add.text(120, 59, 'Zurück · {back}', { ...textStyle, fontSize: '19px', padding: { x: 16, y: 13 }, backgroundColor: '#213d49' })
      .setOrigin(.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.back());
    const multiRow = this.films.length > 2;
    this.films.forEach((film, index) => {
      const width = this.films.length === 1 ? 520 : 380, height = multiRow ? 180 : 276;
      const x = this.films.length === 1 || (this.films.length === 3 && index === 2) ? 480 : 270 + (index % 2) * 420;
      const y = multiRow ? 230 + Math.floor(index / 2) * 200 : 300;
      this.addFilmCard(film, index, x, y, width, height);
    });
    if (this.films.length > 1) {
      this.allFrame = this.add.graphics();
      this.allText = this.add.text(480, 550, 'Alle ansehen', { ...textStyle, fontSize: '21px' }).setOrigin(.5);
      this.add.zone(480, 550, 226, 40).setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.select(this.films.length)).on('pointerdown', () => this.playAll());
    } else this.add.text(480, 484, 'Weitere Filme schaltest du beim Spielen frei.', { ...textStyle, fontSize: '19px', color: '#b8c9c8' }).setOrigin(.5);
    const touch = profileForScene(this) === 'ipadTouch';
    const hint = touch ? 'Film antippen' : this.films.length > 1 ? '{move}: Wählen · Ansehen · {confirm}' : 'Ansehen · {confirm}';
    this.add.text(480, this.allText ? 584 : 555, hint,
      { ...textStyle, fontSize: '16px', color: '#b8c9c8' }).setOrigin(.5);
    this.input.keyboard.on('keydown-LEFT', () => this.moveSelection(-1, 0));
    this.input.keyboard.on('keydown-RIGHT', () => this.moveSelection(1, 0));
    this.input.keyboard.on('keydown-UP', () => this.moveSelection(0, -1));
    this.input.keyboard.on('keydown-DOWN', () => this.moveSelection(0, 1));
    this.input.keyboard.on('keydown-ENTER', () => this.activateSelection());
    this.input.keyboard.on('keydown-ESC', () => this.back());
    this.input.keyboard.on('keydown-F', () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen(); });
    this.events.once('shutdown', () => { this.masks.forEach(mask => mask.destroy()); this.maskShapes.forEach(shape => shape.destroy()); });
    this.updateSelection(); playMusic(this, 'music-menu');
  }

  addBackground() {
    this.add.rectangle(480, 300, 960, 600, 0x0d222d);
    this.add.image(480, 300, 'menu-bg').setDisplaySize(960, 600).setAlpha(.07);
    const curtains = this.add.graphics();
    curtains.fillStyle(0x512c3b).fillPoints([{ x: 0, y: 0 }, { x: 58, y: 0 }, { x: 48, y: 180 }, { x: 15, y: 470 }, { x: 0, y: 600 }], true);
    curtains.fillPoints([{ x: 960, y: 0 }, { x: 902, y: 0 }, { x: 912, y: 180 }, { x: 945, y: 470 }, { x: 960, y: 600 }], true);
    curtains.lineStyle(2, 0xc6a56e, .6).lineBetween(57, 0, 48, 180).lineBetween(48, 180, 15, 470)
      .lineBetween(903, 0, 912, 180).lineBetween(912, 180, 945, 470);
    curtains.fillStyle(0xd5b878, .75).fillRect(0, 0, 960, 5);
  }

  addFilmCard(film, index, x, y, width, height) {
    const frame = this.add.graphics(), imageWidth = width - 24, imageHeight = height - 60;
    const imageY = y - height / 2 + 12 + imageHeight / 2;
    const image = this.add.image(x, imageY, film.thumbnail);
    image.setScale(Math.max(imageWidth / image.width, imageHeight / image.height));
    const shape = this.make.graphics({ x: 0, y: 0, add: false });
    shape.fillStyle(0xffffff).fillRect(x - imageWidth / 2, imageY - imageHeight / 2, imageWidth, imageHeight);
    const mask = shape.createGeometryMask(); image.setMask(mask); this.masks.push(mask); this.maskShapes.push(shape);
    const title = this.add.text(x - width / 2 + 18, y + height / 2 - 23, film.title, { ...textStyle, fontSize: '22px' }).setOrigin(0, .5);
    const play = this.add.graphics(); play.fillStyle(0xe6c783).fillTriangle(x + width / 2 - 37, y + height / 2 - 31,
      x + width / 2 - 37, y + height / 2 - 15, x + width / 2 - 24, y + height / 2 - 23);
    this.add.zone(x, y, width, height).setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.select(index)).on('pointerdown', () => this.playFilm(film.id));
    this.cards.push({ frame, title, x, y, width, height });
  }

  select(index) {
    if (this.showingFilm) return;
    this.selectedIndex = index; this.updateSelection();
  }
  moveSelection(dx, dy) {
    if (this.showingFilm) return;
    const count = this.films.length, index = this.selectedIndex;
    if (index === count) { this.select(dy < 0 || dx < 0 ? count - 1 : 0); return; }
    if (dx) { this.select((index + dx + count) % count); return; }
    const columns = count > 1 ? 2 : 1, row = Math.floor(index / columns), rows = Math.ceil(count / columns);
    if (dy > 0 && row === rows - 1 && this.allText) this.select(count);
    else if (row + dy >= 0 && row + dy < rows) this.select(Math.min(count - 1, index + dy * columns));
  }
  updateSelection() {
    this.cards.forEach((card, index) => {
      const selected = index === this.selectedIndex;
      card.frame.clear().fillStyle(selected ? 0x2b4650 : 0x17313e)
        .fillRoundedRect(card.x - card.width / 2, card.y - card.height / 2, card.width, card.height, 10)
        .lineStyle(selected ? 3 : 1, selected ? 0xf1d294 : 0x506975)
        .strokeRoundedRect(card.x - card.width / 2, card.y - card.height / 2, card.width, card.height, 10);
      card.title.setColor(selected ? '#ffe2a1' : '#fff1d0');
    });
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
