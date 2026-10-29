import { stopMusic } from '../soundManager.js';
import IntroAudio from '../utils/IntroAudio.js';
import BookFilm from '../utils/BookFilm.js';
import { JUNGLE_BOOK_CUES } from '../utils/bookTimeline.js';
import { DRAGON_CLUES, DRAGON_CLUE_CUES, completeDragonClue } from '../utils/dragonStory.js';
import { saveProgress } from '../saveManager.js';
import { advanceStoryPreview } from '../utils/storyPreview.js';

export default class DragonClueScene extends Phaser.Scene {
  constructor() { super({ key: 'DragonClueScene' }); this.isIntro = true; this.canSkip = false; }
  init(data) { this.clueWorld = Object.hasOwn(DRAGON_CLUES, data?.world) ? data.world : 'desert'; }
  create() {
    stopMusic(); this.config = DRAGON_CLUES[this.clueWorld];
    this.elapsed = 0; this.started = false; this.suspended = false; this.leaving = false;
    this.reducedMotion = Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    this.audio = new IntroAudio(undefined, undefined, { music: false }); this.book = new BookFilm(this, this.clueWorld); this.duration = this.book.duration;
    this.unlockAudio = () => this.audio.unlock(this.elapsed);
    this.input.on('pointerdown', this.unlockAudio);
    this.input.keyboard.on('keydown-F', () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen(); });
    this.events.once('shutdown', () => { this.input.off('pointerdown', this.unlockAudio); this.audio.destroy(); this.book.destroy(); });
    this.drawFrame(); this.startIntro();
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
    const now = performance.now(), previous = this.elapsed, duration = this.duration ?? this.config.duration;
    this.elapsed = Math.min(duration, this.elapsed + Math.max(0, Math.min(100, now - this.lastFrameAt)));
    this.lastFrameAt = now; this.audio.setTime(this.elapsed);
    const before = this.book?.frameAt(previous), current = this.book?.frameAt(this.elapsed);
    const sourceTime = current?.sourceTime ?? this.elapsed;
    const cues = this.book && this.clueWorld === 'jungle' ? JUNGLE_BOOK_CUES : DRAGON_CLUE_CUES[this.clueWorld];
    for (const [at, cue] of cues) if ((before?.sourceTime ?? previous) < at && at <= sourceTime) this.audio.play(cue);
    if (before?.turn === null && current?.turn !== null) this.audio.play('paper');
    if (current?.right?.shot.title && before?.index !== current.index) this.audio.play('reveal');
    this.drawFrame();
    if (this.elapsed >= duration) this.finish();
  }
  drawFrame() { this.book.draw(this.elapsed); }
}
