import { stopMusic } from '../soundManager.js';
import IntroAudio from '../utils/IntroAudio.js';
import { INTRO_DURATION, INTRO_FLOOR_LIGHT, INTRO_EXTERIOR_FOREGROUND, getIntroFrame, introCuesBetween } from '../utils/introTimeline.js';

const type = { fontFamily: 'Trebuchet MS, sans-serif', color: '#fff1ce' };
export default class IntroScene extends Phaser.Scene {
  constructor() { super({ key: 'IntroScene' }); this.isIntro = true; }
  create() {
    stopMusic(); this.elapsed = 0; this.started = false; this.suspended = false; this.leaving = false;
    this.reducedMotion = Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    this.audio = new IntroAudio();
    this.bedroom = this.add.container(0, 0);
    this.bedroom.add(this.add.image(480, 300, 'intro-bedroom').setDisplaySize(960, 600));
    this.maskShapes = []; this.filmMasks = [];
    const maskFor = points => {
      const shape = this.make.graphics({ x: 0, y: 0, add: false });
      shape.fillStyle(0xffffff).fillPoints(points, true);
      const mask = shape.createGeometryMask(); this.maskShapes.push(shape); this.filmMasks.push(mask);
      return mask;
    };
    this.dragonShadow = this.add.image(650, 516, 'intro-dragon-0').setTint(0x101827).setAlpha(0).setDisplaySize(370, 94).setAngle(-10);
    this.dragonShadow.setMask(maskFor(INTRO_FLOOR_LIGHT));
    this.bedroom.add(this.dragonShadow);
    this.bedShadow = this.add.image(480, 300, 'intro-bed-ground-shadow');
    this.bedroom.add(this.bedShadow);
    this.bed = this.add.image(480, 600, 'intro-bed-fixed').setOrigin(.5, 1).setDisplaySize(960, 600);
    this.bedroom.add(this.bed);
    this.occupant = this.add.image(350, 397, 'intro-hero-sleep').setOrigin(260 / 440, 1);
    this.bedHero = this.add.image(245, 430, 'intro-hero-push').setOrigin(260 / 440, 1).setVisible(false);
    this.bedroom.add([this.occupant, this.bedHero]);
    this.blanketEmpty = this.add.image(480, 600, 'intro-blanket-empty').setOrigin(.5, 1).setDisplaySize(960, 600).setAlpha(0);
    this.blanket = this.add.image(480, 600, 'intro-blanket-occupied').setOrigin(.5, 1).setDisplaySize(960, 600);
    this.bedroom.add([this.blanketEmpty, this.blanket]);
    this.bedFront = this.add.image(480, 600, 'intro-bed-front').setOrigin(.5, 1).setDisplaySize(960, 600);
    this.bedroom.add(this.bedFront);
    this.exterior = this.add.container(0, 0).setVisible(false);
    this.exterior.add(this.add.image(480, 300, 'intro-exterior').setDisplaySize(960, 600));
    this.dragon = this.add.image(-260, 183, 'intro-dragon-0').setDisplaySize(430, 320);
    this.exterior.add(this.dragon);
    this.sparkles = Array.from({ length: 12 }, (_, i) => this.add.text(0, 0, '✦', { ...type, color: i % 2 ? '#ffdf80' : '#e6f5ff', fontSize: (11 + i % 3 * 3) + 'px' }).setOrigin(.5));
    this.exterior.add(this.sparkles);
    this.foreground = INTRO_EXTERIOR_FOREGROUND.map(points => {
      const image = this.add.image(480, 300, 'intro-exterior').setDisplaySize(960, 600).setMask(maskFor(points));
      this.exterior.add(image); return image;
    });
    this.helperShadow = this.add.ellipse(448, 518, 70, 13, 0x1c1523, .25);
    this.heroShadow = this.add.ellipse(565, 540, 122, 19, 0x1c1523, .2).setVisible(false);
    this.hero = this.add.image(565, 535, 'intro-hero-ready').setOrigin(260 / 440, 1).setVisible(false);
    this.helper = this.add.image(448, 515, 'intro-helper-sleep').setOrigin(.5, 1).setDisplaySize(89, 92);
    this.sleepZ = [0, 1, 2].map(i => this.add.text(245, 290, i === 2 ? 'Z' : 'z', { ...type,
      fontFamily: 'Georgia, serif', fontStyle: 'bold', fontSize: (23 + i * 4) + 'px', color: '#d5efff',
      stroke: '#23405c', strokeThickness: 3 }).setOrigin(.5));
    this.surprise = this.add.text(0, 0, '!', { ...type, fontSize: '34px', color: '#ffde83', stroke: '#5b3925', strokeThickness: 3 }).setOrigin(.5).setVisible(false);
    this.credit = this.add.text(60, 54, '', { ...type, fontFamily: 'Georgia, serif', fontSize: '27px', stroke: '#252539', strokeThickness: 4 });
    this.finalShade = this.add.rectangle(480, 300, 960, 600, 0x102235, 0);
    this.title = this.add.text(480, 145, 'Ritter & sein\ngelber Begleiter', { ...type, fontFamily: 'Georgia, serif', fontSize: '53px', align: 'center', color: '#ffe1a0', stroke: '#183044', strokeThickness: 6 }).setOrigin(.5).setAlpha(0);
    this.transition = this.add.rectangle(480, 300, 960, 600, 0x081323, 1).setAlpha(0);
    this.skipButton = this.add.text(942, 582, 'Überspringen · Leertaste', { ...type, fontSize: '14px',
      stroke: '#182332', strokeThickness: 2, padding: { x: 10, y: 10 } }).setOrigin(1, 1).setAlpha(.6)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.finish())
      .on('pointerover', () => this.skipButton.setAlpha(1)).on('pointerout', () => this.skipButton.setAlpha(.6));
    this.unlockAudio = () => this.audio.unlock(this.elapsed);
    this.input.on('pointerdown', this.unlockAudio);
    this.input.keyboard.on('keydown-F', () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen(); });
    this.events.once('shutdown', () => {
      this.input.off('pointerdown', this.unlockAudio); this.audio.destroy();
      this.filmMasks.forEach(mask => mask.destroy()); this.maskShapes.forEach(shape => shape.destroy());
    });
    this.drawFrame(getIntroFrame(0, this.reducedMotion));
    this.startIntro();
  }
  startIntro() {
    if (this.leaving || (this.started && !this.suspended)) return;
    if (this.suspended) this.audio.resume(this.elapsed); else this.audio.start();
    this.lastFrameAt = performance.now();
    this.started = true; this.suspended = false;
  }
  suspendIntro() {
    if (!this.started || this.suspended || this.leaving) return;
    this.suspended = true; this.audio.pause();
  }
  finish() { if (this.leaving) return; this.leaving = true; this.audio.destroy(); this.scene.start('MainMenuScene'); }
  update() {
    if (!this.started || this.suspended || this.leaving) return;
    const now = performance.now(), previous = this.elapsed;
    // Credits and sound follow real time even if the game loop's delta is scaled.
    this.elapsed = Math.min(INTRO_DURATION, this.elapsed + Math.max(0, Math.min(100, now - this.lastFrameAt)));
    this.lastFrameAt = now;
    this.audio.setTime(this.elapsed);
    introCuesBetween(previous, this.elapsed).forEach(([, cue]) => this.audio.play(cue));
    const frame = getIntroFrame(this.elapsed, this.reducedMotion); this.drawFrame(frame); this.audio.setMusicVolume(frame.musicVolume);
    if (frame.done) this.finish();
  }
  drawFrame(f) {
    const outside = f.stage === 'exterior'; this.bedroom.setVisible(!outside); this.exterior.setVisible(outside);
    const occupant = f.occupant;
    this.occupant.setVisible(occupant.visible).setTexture('intro-hero-' + occupant.pose)
      .setPosition(occupant.x, occupant.y).setAngle(occupant.angle).setScale(occupant.scaleX, occupant.scaleY);
    this.blanket.setDisplaySize(960, 600 * f.blanket.scaleY).setAlpha(1 - f.blanket.empty);
    // Keep the settled cloth opaque underneath the fading body mound, so
    // the mattress cannot show through the overlapping blankets.
    this.blanketEmpty.setAlpha(f.blanket.empty > 0 ? 1 : 0);
    this.dragonShadow.setPosition(f.shadow.x, f.shadow.y).setTexture('intro-dragon-' + f.shadow.frame)
      .setDisplaySize(f.shadow.width, f.shadow.height).setAngle(f.shadow.angle).setAlpha(outside ? 0 : f.shadow.alpha);
    this.dragon.setPosition(f.dragon.x, f.dragon.y).setTexture('intro-dragon-' + f.dragon.frame).setDisplaySize(f.dragon.width, f.dragon.height);
    this.sparkles.forEach((spark, i) => {
      const p = ((f.time / 1100 + i / 12) % 1);
      spark.setPosition(f.dragon.x - 115 - p * 135, f.dragon.y + 77 + Math.sin(i * 8 + p * 4) * 26).setAlpha((1 - p) * .8);
    });
    const h = f.helper;
    this.helper.setTexture('intro-helper-' + h.pose).setPosition(h.x, h.y).setDisplaySize(89 / (h.stretch || 1), 92 * (h.stretch || 1));
    this.helperShadow.setPosition(h.x, h.groundY + 1).setAlpha(outside ? 0 : .23);
    const k = f.knight;
    [this.hero, this.bedHero].forEach(image => image.setTexture('intro-hero-' + k.pose)
      .setPosition(k.x, k.y).setAngle(k.angle).setScale(k.scaleX, k.scaleY));
    this.hero.setVisible(k.visible && !k.behindBed); this.bedHero.setVisible(k.visible && k.behindBed);
    this.heroShadow.setVisible(f.knight.visible).setPosition(f.knight.x, (f.knight.groundY || 535) + 3);
    this.sleepZ.forEach((z, i) => {
      const sleep = f.sleepSymbols[i]; z.setPosition(sleep.x, sleep.y).setScale(sleep.scale).setAlpha(sleep.alpha);
    });
    this.surprise.setVisible(f.helperSurprised).setPosition(h.x, h.y - 116);
    this.credit.setText(f.credit).setAlpha(f.creditAlpha);
    this.finalShade.setAlpha(f.titleAlpha * .35); this.title.setAlpha(f.titleAlpha);
    this.transition.setAlpha(f.transition);
  }
}
