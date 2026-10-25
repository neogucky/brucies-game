import { stopMusic } from '../soundManager.js';
import IntroAudio from '../utils/IntroAudio.js';
import { INTRO_DURATION, getIntroFrame, introCuesBetween, introReturnScene } from '../utils/introTimeline.js';

const type = { fontFamily: 'Trebuchet MS, sans-serif', color: '#fff1ce' };
export default class IntroScene extends Phaser.Scene {
  constructor() { super({ key: 'IntroScene' }); this.isIntro = true; }
  init(data) { this.returnScene = introReturnScene(data?.returnScene); }
  create() {
    stopMusic(); this.elapsed = 0; this.started = false; this.suspended = false; this.leaving = false;
    this.reducedMotion = Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    this.audio = new IntroAudio();
    this.bedroom = this.add.container(0, 0);
    this.bedroom.add(this.add.image(480, 300, 'intro-bedroom').setDisplaySize(960, 600));
    this.bedroom.add(this.add.ellipse(316, 537, 490, 31, 0x1c1523, .25));
    this.bed = this.add.image(315, 542, 'intro-bed-sleep').setOrigin(.5, 1).setDisplaySize(535, 418);
    this.bedroom.add(this.bed);
    this.dragonShadow = this.add.image(760, 250, 'intro-dragon-0').setTint(0x11172b).setAlpha(0).setDisplaySize(355, 265);
    this.bedroom.add(this.dragonShadow);
    this.windowShape = this.make.graphics({ x: 0, y: 0, add: false });
    this.windowShape.fillStyle(0xffffff).fillRoundedRect(618, 43, 280, 324, { tl: 140, tr: 140, bl: 0, br: 0 });
    this.windowMask = this.windowShape.createGeometryMask(); this.dragonShadow.setMask(this.windowMask);

    this.exterior = this.add.container(0, 0).setVisible(false);
    this.exterior.add(this.add.image(480, 300, 'intro-exterior').setDisplaySize(960, 600));
    this.dragon = this.add.image(-200, 245, 'intro-dragon-0').setDisplaySize(500, 370);
    this.exterior.add(this.dragon);
    this.sparkles = Array.from({ length: 12 }, (_, i) => this.add.text(0, 0, '✦', { ...type, color: i % 2 ? '#ffdf80' : '#e6f5ff', fontSize: (11 + i % 3 * 3) + 'px' }).setOrigin(.5));
    this.exterior.add(this.sparkles);
    this.helperShadow = this.add.ellipse(448, 518, 70, 13, 0x1c1523, .25);
    this.heroShadow = this.add.ellipse(510, 540, 122, 19, 0x1c1523, .2).setVisible(false);
    this.hero = this.add.image(510, 535, 'intro-knight-ready').setOrigin(.5, 1).setDisplaySize(280, 335).setVisible(false);
    this.helper = this.add.image(448, 515, 'intro-helper-sleep').setOrigin(.5, 1).setDisplaySize(89, 92);
    this.sleepZ = [0, 1, 2].map(i => this.add.text(193, 291, i === 2 ? 'Z' : 'z', { ...type, fontFamily: 'Georgia, serif', fontSize: (17 + i * 5) + 'px', color: '#b5d9ed' }).setOrigin(.5));
    this.surprise = this.add.text(0, 0, '!', { ...type, fontSize: '34px', color: '#ffde83', stroke: '#5b3925', strokeThickness: 3 }).setOrigin(.5).setVisible(false);
    this.credit = this.add.text(60, 54, '', { ...type, fontFamily: 'Georgia, serif', fontSize: '27px', stroke: '#252539', strokeThickness: 4 });
    this.finalShade = this.add.rectangle(480, 300, 960, 600, 0x102235, 0);
    this.title = this.add.text(480, 145, 'Ritter & sein\ngelber Begleiter', { ...type, fontFamily: 'Georgia, serif', fontSize: '53px', align: 'center', color: '#ffe1a0', stroke: '#183044', strokeThickness: 6 }).setOrigin(.5).setAlpha(0);
    this.transition = this.add.rectangle(480, 300, 960, 600, 0x081323, 1).setAlpha(0);
    this.add.rectangle(480, 18, 960, 36, 0x081323, .86);
    this.add.rectangle(480, 584, 960, 32, 0x081323, .86);
    this.caption = this.add.text(28, 584, 'Eine kleine Geschichte vor dem Abenteuer', { ...type, fontSize: '13px', color: '#d3d7d8' }).setOrigin(0, .5);
    this.skipButton = this.add.text(932, 18, 'Überspringen · {back}', { ...type, fontSize: '16px', padding: { x: 14, y: 8 } }).setOrigin(1, .5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.finish());
    this.soundButton = this.add.text(28, 18, 'Ton: an', { ...type, fontSize: '16px', padding: { x: 12, y: 8 } }).setOrigin(0, .5).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.audio.mute(!this.audio.muted); this.soundButton.setText(this.audio.muted ? 'Ton: aus' : 'Ton: an');
    });
    this.startPanel = this.add.container(0, 0).setDepth(50);
    const startShade = this.add.rectangle(480, 300, 960, 530, 0x142437, .22);
    this.startTitle = this.add.text(66, 107, 'Ritter & sein\ngelber Begleiter', { ...type, fontFamily: 'Georgia, serif', fontSize: '43px', color: '#ffe7b0', stroke: '#172d40', strokeThickness: 5 }).setOrigin(0, .5);
    this.startButton = this.add.text(480, 522, 'Intro starten · {confirm}', { ...type, fontSize: '24px', backgroundColor: '#385044', padding: { x: 30, y: 15 } }).setOrigin(.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.startIntro());
    this.startPanel.add([startShade, this.startTitle, this.startButton]);
    this.input.keyboard.on('keydown-F', () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen(); });
    this.events.once('shutdown', () => { this.audio.destroy(); this.windowMask.destroy(); this.windowShape.destroy(); });
    this.drawFrame(getIntroFrame(0, this.reducedMotion));
  }
  startIntro() {
    if (this.leaving || (this.started && !this.suspended)) return;
    this.startPanel.setVisible(false);
    if (this.suspended) this.audio.resume(); else this.audio.start();
    this.lastFrameAt = performance.now();
    this.started = true; this.suspended = false;
  }
  suspendIntro() {
    if (!this.started || this.suspended || this.leaving) return;
    this.suspended = true; this.audio.pause();
    this.startTitle.setText('Die Geschichte wartet auf dich.').setFontSize(29);
    this.startButton.setText('Fortsetzen · {confirm}'); this.startPanel.setVisible(true);
  }
  finish() { if (this.leaving) return; this.leaving = true; this.audio.destroy(); this.scene.start(this.returnScene); }
  update() {
    if (!this.started || this.suspended || this.leaving) return;
    const now = performance.now(), previous = this.elapsed;
    // Credits and sound follow real time even if the game loop's delta is scaled.
    this.elapsed = Math.min(INTRO_DURATION, this.elapsed + Math.max(0, Math.min(100, now - this.lastFrameAt)));
    this.lastFrameAt = now;
    introCuesBetween(previous, this.elapsed).forEach(([, cue]) => this.audio.play(cue));
    const frame = getIntroFrame(this.elapsed, this.reducedMotion); this.drawFrame(frame); this.audio.setMusicVolume(frame.musicVolume);
    if (frame.done) this.finish();
  }
  drawFrame(f) {
    const outside = f.stage === 'exterior'; this.bedroom.setVisible(!outside); this.exterior.setVisible(outside);
    this.bed.setTexture('intro-bed-' + f.bedPose);
    this.dragonShadow.setPosition(f.shadow.x, 241).setAlpha(outside ? 0 : f.shadow.alpha);
    this.dragon.setPosition(f.dragon.x, f.dragon.y).setTexture('intro-dragon-' + f.dragon.frame);
    this.sparkles.forEach((spark, i) => {
      const p = ((f.time / 1100 + i / 12) % 1);
      spark.setPosition(f.dragon.x - 115 - p * 135, f.dragon.y + 77 + Math.sin(i * 8 + p * 4) * 26).setAlpha((1 - p) * .8);
    });
    const h = f.helper;
    this.helper.setTexture('intro-helper-' + h.pose).setPosition(h.x, h.y).setDisplaySize(89 / (h.stretch || 1), 92 * (h.stretch || 1));
    this.helperShadow.setPosition(h.x, h.groundY + 1).setAlpha(outside ? 0 : .23);
    this.hero.setVisible(f.knight.visible).setPosition(f.knight.x, f.knight.y);
    this.heroShadow.setVisible(f.knight.visible).setPosition(f.knight.x, (f.knight.groundY || 535) + 3);
    this.sleepZ.forEach((z, i) => {
      const p = ((f.time / 2200 + i / 3) % 1); z.setPosition(193 + p * 24, 300 - p * 63).setAlpha(!outside && f.time < 5200 ? (1 - p) * .8 : 0);
    });
    this.surprise.setVisible(f.time >= 5200 && f.time < 5800).setPosition(h.x, h.y - 116);
    this.credit.setText(f.credit).setAlpha(f.creditAlpha);
    this.finalShade.setAlpha(f.titleAlpha * .35); this.title.setAlpha(f.titleAlpha);
    this.transition.setAlpha(f.transition);
  }
}
