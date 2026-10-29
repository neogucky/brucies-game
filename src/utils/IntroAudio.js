const CLIPS = ['music', 'snore', 'whoosh', 'hop', 'boing', 'yawn', 'chime', 'paper', 'splash', 'hero-leap', 'reveal'];

// Autoplay never holds up the film. If the browser suspends audio, a later
// natural gesture unlocks it at the current story time, without queued cues.
export default class IntroAudio {
  constructor(Context = globalThis.AudioContext || globalThis.webkitAudioContext, fetcher = globalThis.fetch, { music = true } = {}) {
    this.buffers = new Map(); this.sources = new Set(); this.muted = false;
    this.destroyed = false; this.started = false; this.paused = false; this.loadErrors = [];
    this.elapsedMs = 0; this.musicEnabled = music;
    this.ready = Promise.resolve(); if (!Context || !fetcher) return;
    try { this.context = new Context(); } catch { return; }
    this.master = this.context.createGain(); this.master.connect(this.context.destination);
    this.musicGain = this.context.createGain(); this.musicGain.gain.value = .2; this.musicGain.connect(this.master);
    this.effectsGain = this.context.createGain(); this.effectsGain.gain.value = .38; this.effectsGain.connect(this.master);
    this.ready = Promise.all(CLIPS.filter(name => music || name !== 'music').map(async name => {
      try {
        const response = await fetcher('assets/intro/sounds/' + name + '.wav');
        if (!response.ok) throw new Error(name);
        const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
        if (!this.destroyed) this.buffers.set(name, buffer);
      } catch { if (!this.destroyed) this.loadErrors.push(name); }
    }));
  }
  start() {
    if (this.destroyed || !this.context) return;
    this.started = true; this.paused = false;
    return this.unlock(0);
  }
  setTime(milliseconds) { this.elapsedMs = Math.max(0, milliseconds || 0); }
  unlock(milliseconds = this.elapsedMs) {
    this.setTime(milliseconds);
    if (this.destroyed || !this.context || this.paused) return Promise.resolve();
    try {
      return Promise.resolve(this.context.resume()).then(() => this.ready).then(() => {
        if (!this.destroyed && !this.paused && this.started && this.musicEnabled) this.play('music');
      }).catch(() => {});
    } catch { return Promise.resolve(); }
  }
  play(name) {
    if (!this.context || this.context.state !== 'running' || this.destroyed || this.paused || !this.buffers.has(name) || (name === 'music' && this.musicSource)) return;
    const source = this.context.createBufferSource(); source.buffer = this.buffers.get(name); source.loop = name === 'music';
    source.connect(name === 'music' ? this.musicGain : this.effectsGain); this.sources.add(source);
    source.onended = () => { this.sources.delete(source); source.disconnect(); };
    if (name === 'music') this.musicSource = source;
    if (name === 'music') source.start(0, this.elapsedMs / 1000 % source.buffer.duration);
    else source.start();
  }
  setMusicVolume(volume) { if (this.musicGain) this.musicGain.gain.value = Math.max(0, Math.min(1, volume)); }
  mute(value) { this.muted = Boolean(value); if (this.master) this.master.gain.value = this.muted ? 0 : 1; }
  pause() { this.paused = true; this.context?.suspend()?.catch?.(() => {}); }
  resume(milliseconds = this.elapsedMs) {
    if (this.destroyed) return; this.paused = false;
    return this.unlock(milliseconds);
  }
  destroy() {
    if (this.destroyed) return; this.destroyed = true;
    this.sources.forEach(source => { source.onended = null; source.stop(); source.disconnect(); });
    this.sources.clear(); this.buffers.clear(); this.context?.close()?.catch?.(() => {});
  }
}
