import { stopMusic } from '../soundManager.js';
import IntroAudio from '../utils/IntroAudio.js';
import { DRAGON_CLUES, DRAGON_TRACKS, DRAGON_CLUE_CUES, dragonClueFrame, completeDragonClue } from '../utils/dragonStory.js';
import { saveProgress } from '../saveManager.js';
import { advanceStoryPreview } from '../utils/storyPreview.js';

const type = { fontFamily: 'Trebuchet MS, sans-serif', color: '#fff2d1' };
const caveTint = (depth = 0) => ((255 - Math.round(175 * depth)) << 16) |
  ((255 - Math.round(185 * depth)) << 8) | (255 - Math.round(192 * depth));
export default class DragonClueScene extends Phaser.Scene {
  constructor() { super({ key: 'DragonClueScene' }); this.isIntro = true; }
  init(data) { this.clueWorld = Object.hasOwn(DRAGON_CLUES, data?.world) ? data.world : 'desert'; }
  create() {
    stopMusic(); this.config = DRAGON_CLUES[this.clueWorld];
    this.elapsed = 0; this.started = false; this.suspended = false; this.leaving = false;
    this.reducedMotion = Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    this.audio = new IntroAudio(); this.film = this.add.container(0, 0);
    this.film.add(this.add.image(480, 300, this.config.background).setDisplaySize(960, 600));
    const marks = DRAGON_TRACKS[this.clueWorld] || [];
    this.tracks = marks.map(([x, y], i) => {
      const desert = this.clueWorld === 'desert';
      const g = this.add.graphics().setPosition(x, y).setScale(desert ? .82 - i * .055 : 1 - i * .07)
        .setAngle(35 + (i % 2 ? 10 : -10)).setAlpha(desert ? .15 : .5);
      g.fillStyle(0x6e451f, .55).fillEllipse(0, 5, 35, 29)
        .fillEllipse(-15, -12, 12, 19).fillEllipse(0, -19, 13, 21).fillEllipse(15, -12, 12, 19)
        .fillStyle(0x56351c, .7).fillTriangle(-19, -16, -14, -28, -10, -15)
        .fillTriangle(-5, -24, 0, -36, 5, -24).fillTriangle(10, -15, 14, -28, 19, -16);
      this.film.add(g); return g;
    });
    this.helperShadow = this.add.ellipse(280, 508, 55, 10, 0x302216, .22);
    this.heroShadow = this.add.ellipse(150, 533, 65, 12, 0x302216, .22);
    this.hero = this.add.image(150, 535, 'knight-standing').setOrigin(.5, 1).setDisplaySize(118, 118);
    this.heroNext = this.add.image(150, 535, 'story-hero-quiet').setOrigin(.5, 1).setDisplaySize(118, 118).setAlpha(0);
    this.helper = this.add.image(280, 510, 'intro-helper-awake').setOrigin(.5, 1).setDisplaySize(74, 74);
    this.film.add([this.helperShadow, this.heroShadow, this.hero, this.heroNext, this.helper]);
    this.surprise = this.add.text(280, 395, '!', { ...type, fontSize: '34px', fontStyle: 'bold', color: '#ee4140', stroke: '#fff0d5', strokeThickness: 4 }).setOrigin(.5);
    this.film.add(this.surprise);
    this.ripples = this.add.graphics(); this.film.add(this.ripples);
    if (this.clueWorld === 'underground') this.createBrochure();
    if (this.clueWorld === 'jungle') {
      this.lakeTreasure = this.add.image(840, 310, 'chest-closed').setDisplaySize(44, 34).setAlpha(.18);
      this.film.addAt(this.lakeTreasure, 1);
    }
    this.readingShot = this.add.image(480, 300, 'story-reading').setDisplaySize(960, 600).setDepth(2).setVisible(false);
    this.add.rectangle(480, 10, 960, 20, 0x111821, .85).setDepth(3);
    this.add.rectangle(480, 590, 960, 20, 0x111821, .85).setDepth(3);
    this.fade = this.add.rectangle(480, 300, 960, 600, 0x101820).setDepth(5);
    this.skipButton = this.add.text(942, 588, 'Überspringen · Leertaste', { ...type, fontSize: '14px', backgroundColor: '#142328', padding: { x: 8, y: 4 } })
      .setOrigin(1, 1).setAlpha(.6).setDepth(6).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.finish());
    this.unlockAudio = () => this.audio.unlock(this.elapsed);
    this.input.on('pointerdown', this.unlockAudio);
    this.input.keyboard.on('keydown-F', () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen(); });
    this.events.once('shutdown', () => { this.input.off('pointerdown', this.unlockAudio); this.audio.destroy(); });
    this.drawFrame(dragonClueFrame(this.clueWorld, 0, this.reducedMotion));
    this.startIntro();
  }

  createBrochure() {
    this.brochure = this.add.container(596, 475).setAngle(-12);
    const shadow = this.add.ellipse(2, 4, 38, 12, 0x151b20, .25);
    const paper = this.add.rectangle(0, 0, 36, 18, 0xfff0c7).setStrokeStyle(1, 0xa17036);
    const photo = this.add.image(0, 0, 'worldmap-jungle-bg').setDisplaySize(27, 10);
    this.brochure.add([shadow, paper, photo]); this.film.addAt(this.brochure, 1);
  }

  startIntro() {
    if (this.leaving || (this.started && !this.suspended)) return;
    if (this.suspended) this.audio.resume(this.elapsed); else this.audio.start();
    this.started = true; this.suspended = false; this.lastFrameAt = performance.now();
  }
  suspendIntro() { if (this.started && !this.leaving) { this.suspended = true; this.audio.pause(); } }
  finish() {
    if (this.leaving) return; this.leaving = true; this.audio.destroy();
    if (advanceStoryPreview(this)) return;
    const next = completeDragonClue(this.registry.get('saveData') || {}, this.clueWorld);
    this.registry.set('saveData', next); saveProgress(next);
    this.scene.start(this.config.map);
  }
  update() {
    if (!this.started || this.suspended || this.leaving) return;
    const now = performance.now(), previous = this.elapsed;
    this.elapsed = Math.min(this.config.duration, this.elapsed + Math.max(0, Math.min(100, now - this.lastFrameAt)));
    this.lastFrameAt = now; this.audio.setTime(this.elapsed);
    for (const [at, cue] of DRAGON_CLUE_CUES[this.clueWorld]) if (previous < at && at <= this.elapsed) this.audio.play(cue);
    const f = dragonClueFrame(this.clueWorld, this.elapsed, this.reducedMotion); this.drawFrame(f);
    if (f.done) this.finish();
  }
  drawFrame(f) {
    const shoulder = f.shot === 'shoulder';
    this.film.setVisible(!shoulder); this.readingShot.setVisible(shoulder);
    // A cut to the knight's shoulder establishes the real hands and leaflet.
    // Only the camera moves closer; the paper never grows or floats across the room.
    if (shoulder) this.readingShot.setDisplaySize(960 * (1 + f.readProgress * .035), 600 * (1 + f.readProgress * .035));
    this.film.setScale(f.cameraZoom).setPosition(480 - f.cameraX * f.cameraZoom, 300 - f.cameraY * f.cameraZoom);
    const female = this.registry.get('saveData')?.playerGender === 'female', gender = female ? '-female' : '';
    this.hero.setTexture(f.hero.pose ? 'story-hero-' + f.hero.pose : f.hero.walking ? `knight${gender}-walk-${Math.floor(f.time / 125) % 6}` : 'story-hero-quiet')
      .setPosition(f.hero.x, f.hero.y - (f.hero.walking ? Math.abs(Math.sin(f.time / 130)) * 2 : 0));
    const size = 118 - (535 - f.hero.y) * .18;
    this.hero.setDisplaySize(size, size).setAngle(f.hero.angle || 0).setAlpha((f.hero.opacity ?? 1) * (1 - (f.hero.blend || 0))).setTint(caveTint(f.hero.caveDepth));
    this.heroNext.setVisible(Boolean(f.hero.nextPose)).setTexture('story-hero-' + (f.hero.nextPose || 'quiet'))
      .setPosition(this.hero.x, this.hero.y).setDisplaySize(size, size).setAlpha((f.hero.opacity ?? 1) * (f.hero.blend || 0));
    this.heroShadow.setPosition(f.hero.x, f.hero.y - 2).setScale(size / 118)
      .setAlpha(.22 * (f.hero.opacity ?? 1) * (1 - (f.hero.caveDepth || 0)));
    const helperSize = 74 - (510 - f.helper.groundY) * .1;
    const pose = f.helper.pose || (f.surprise ? 'peek' : f.helper.hopping || f.beat === 'follow' || f.beat === 'arrive' ? 'hop' : 'awake');
    this.helper.setTexture((['observe', 'beckon', 'point'].includes(pose) ? 'story-helper-' : 'intro-helper-') + pose).setFlipX(Boolean(f.helper.flipX)).setAngle(f.helper.angle || 0)
      .setPosition(f.helper.x, f.helper.y).setDisplaySize(helperSize / f.helper.stretch, helperSize * f.helper.stretch)
      .setAlpha(f.helper.opacity ?? 1).setTint(caveTint(f.helper.caveDepth));
    this.helperShadow.setPosition(f.helper.x, f.helper.groundY - 2).setScale(helperSize / 74)
      .setAlpha(.22 * (f.helper.opacity ?? 1) * (1 - (f.helper.caveDepth || 0)));
    this.surprise.setVisible(f.surprise).setPosition(f.helper.x, f.helper.y - helperSize - 20);
    this.tracks.forEach((track, i) => track.setVisible(this.clueWorld !== 'underground' && i < f.trackCount)
      .setAlpha(this.clueWorld === 'desert' ? f.shot === 'closeup' ? .5 : .2 : .45));
    this.brochure?.setVisible(f.groundBrochure);
    this.lakeTreasure?.setAlpha(f.treasure).setY(310 + Math.sin(f.time / 650) * 2);
    this.ripples.clear();
    if (f.ripple) for (let i = 0; i < 3; i++) {
      const p = (f.time / 2400 + i / 3) % 1;
      this.ripples.lineStyle(2, 0xe4ffff, (1 - p) * f.ripple * .7).strokeEllipse(840, 314, 35 + p * 100, 10 + p * 25);
      const swim = Math.max(0, Math.min(1, (f.time - 13000) / 3000));
      this.ripples.lineStyle(2, 0xc8f6ff, (1 - p) * f.ripple * .6)
        .strokeEllipse(752 + swim * 88 - i * 9, 367 - swim * 50 + i * 4, 8 + p * 15, 4 + p * 7);
    }
    if (f.splash > 0) {
      this.ripples.lineStyle(3, 0xc7f8ff, f.splash).strokeEllipse(752, 374, 22 + f.splash * 30, 8 + f.splash * 12);
      for (let i = 0; i < 7; i++) {
        const angle = -Math.PI + i * Math.PI / 6;
        this.ripples.fillStyle(0xc7f8ff, f.splash).fillEllipse(752 + Math.cos(angle) * 30 * f.splash,
          373 + Math.sin(angle) * 36 * f.splash, 4, 8);
      }
    }
    this.fade.setAlpha(f.fade);
  }
}
