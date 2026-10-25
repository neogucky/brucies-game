const CLIPS = ['music', 'snore', 'whoosh', 'hop', 'boing', 'yawn', 'chime'];

// A single context unlocks every cue with the Start gesture, including on iPad.
// It belongs only to the intro and is closed when the scene ends.
export default class IntroAudio {
  constructor(Context = globalThis.AudioContext || globalThis.webkitAudioContext, fetcher = globalThis.fetch) {
    this.buffers = new Map(); this.sources = new Set(); this.muted = false;
    this.destroyed = false; this.started = false; this.paused = false; this.loadErrors = [];
    this.ready = Promise.resolve(); if (!Context || !fetcher) return;
    try { this.context = new Context(); } catch { return; }
    this.master = this.context.createGain(); this.master.connect(this.context.destination);
    this.musicGain = this.context.createGain(); this.musicGain.gain.value = .2; this.musicGain.connect(this.master);
    this.effectsGain = this.context.createGain(); this.effectsGain.gain.value = .38; this.effectsGain.connect(this.master);
    this.ready = Promise.all(CLIPS.map(async name => {
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
    this.context.resume()?.catch?.(() => {});
    this.ready.then(() => { if (!this.destroyed && !this.paused) this.play('music'); });
  }
  play(name) {
    if (!this.context || this.destroyed || this.paused || !this.buffers.has(name) || (name === 'music' && this.musicSource)) return;
    const source = this.context.createBufferSource(); source.buffer = this.buffers.get(name); source.loop = name === 'music';
    source.connect(name === 'music' ? this.musicGain : this.effectsGain); this.sources.add(source);
    source.onended = () => { this.sources.delete(source); source.disconnect(); };
    if (name === 'music') this.musicSource = source;
    source.start();
  }
  setMusicVolume(volume) { if (this.musicGain) this.musicGain.gain.value = Math.max(0, Math.min(1, volume)); }
  mute(value) { this.muted = Boolean(value); if (this.master) this.master.gain.value = this.muted ? 0 : 1; }
  pause() { this.paused = true; this.context?.suspend()?.catch?.(() => {}); }
  resume() {
    if (this.destroyed) return; this.paused = false; this.context?.resume()?.catch?.(() => {});
    this.ready.then(() => { if (!this.destroyed && !this.paused && this.started) this.play('music'); });
  }
  destroy() {
    if (this.destroyed) return; this.destroyed = true;
    this.sources.forEach(source => { source.onended = null; source.stop(); source.disconnect(); });
    this.sources.clear(); this.buffers.clear(); this.context?.close()?.catch?.(() => {});
  }
}
