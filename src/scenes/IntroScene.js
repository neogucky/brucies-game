import { stopMusic, playMusic, setMusicVolume, pauseMusic, resumeMusic } from '../soundManager.js';
import IntroAudio from '../utils/IntroAudio.js';
import BookFilm from '../utils/BookFilm.js';
import { advanceStoryPreview } from '../utils/storyPreview.js';
import { INTRO_DURATION, introCuesBetween } from '../utils/introTimeline.js';

import { bookIntroMusicMix } from '../utils/bookTimeline.js';

const type = { fontFamily: 'Trebuchet MS, sans-serif', color: '#fff1ce' };
export default class IntroScene extends Phaser.Scene {
  constructor() { super({ key: 'IntroScene' }); this.isIntro = true; this.canSkip = true; }
  init(data) { this.newGame = data?.mode === 'newGame'; }
  create() {
    stopMusic(); this.destinationMusicStarted = false; this.elapsed = 0; this.started = false; this.suspended = false; this.leaving = false;
    this.reducedMotion = Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    this.audio = new IntroAudio(); this.book = new BookFilm(this, this.newGame ? 'adventure' : 'intro'); this.duration = this.book.duration;
    this.skipButton = this.add.text(948, 598, 'Überspringen · Leertaste', { ...type, fontSize: '14px',
      stroke: '#182332', strokeThickness: 2, padding: { x: 8, y: 4 } }).setOrigin(1, 1).setAlpha(.6)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.finish())
      .on('pointerover', () => this.skipButton.setAlpha(1)).on('pointerout', () => this.skipButton.setAlpha(.6));
    this.unlockAudio = () => {
      this.audio.unlock(this.elapsed);
      this.sound?.context?.resume()?.catch?.(() => {});
    };
    this.input.on('pointerdown', this.unlockAudio);
    this.input.keyboard.on('keydown-F', () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen(); });
    this.events.once('shutdown', () => {
      this.input.off('pointerdown', this.unlockAudio); this.audio.destroy(); this.book.destroy();
    });
    this.drawFrame(); this.startIntro();
  }
  startIntro() {
    if (this.leaving || (this.started && !this.suspended)) return;
    if (this.suspended) { this.audio.resume(this.elapsed); if (this.destinationMusicStarted) resumeMusic(); } else this.audio.start();
    this.sound?.context?.resume()?.catch?.(() => {});
    this.lastFrameAt = performance.now();
    this.started = true; this.suspended = false;
  }
  suspendIntro() {
    if (!this.started || this.suspended || this.leaving) return;
    this.suspended = true; this.audio.pause(); if (this.destinationMusicStarted) pauseMusic();
  }
  finish() {
    if (this.leaving) return; this.leaving = true; this.audio.destroy();
    if (this.destinationMusicStarted) resumeMusic();
    if (this.newGame) { this.scene.start('DessertMapScene'); return; }
    if (!advanceStoryPreview(this)) this.scene.start('MainMenuScene', {});
  }
  update() {
    if (!this.started || this.suspended || this.leaving) return;
    const now = performance.now(), previous = this.elapsed, duration = this.duration ?? INTRO_DURATION;
    this.elapsed = Math.min(duration, this.elapsed + Math.max(0, Math.min(100, now - this.lastFrameAt)));
    this.lastFrameAt = now;
    const before = this.book?.frameAt(previous), current = this.book?.frameAt(this.elapsed);
    const sourceTime = current?.sourceTime ?? this.elapsed;
    this.audio.setTime(this.elapsed);
    introCuesBetween(before?.sourceTime ?? previous, sourceTime).forEach(([, cue]) => this.audio.play(cue));
    if (before?.turn === null && current?.turn !== null) this.audio.play('paper');
    if (current?.right?.shot.title && before?.index !== current.index) this.audio.play('reveal');
    this.updateMusic(sourceTime); this.drawFrame();
    if (this.elapsed >= duration) this.finish();
  }
  updateMusic(sourceTime) {
    const mix = bookIntroMusicMix(sourceTime);
    this.audio.setMusicVolume(mix.sleep);
    if (mix.title > 0 && !this.destinationMusicStarted) {
      playMusic(this, this.newGame ? 'music-desert' : 'music-menu', { volume: 0 }); this.destinationMusicStarted = true;
    } else if (mix.title === 0 && this.destinationMusicStarted) {
      // The isolated film viewer can seek backwards.
      stopMusic(); this.destinationMusicStarted = false;
    }
    if (this.destinationMusicStarted) setMusicVolume(mix.title);
  }
  drawFrame() { this.book.draw(this.elapsed); }
}
