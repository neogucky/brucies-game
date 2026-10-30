let currentMusic = null;
let currentKey = null;
let currentRate = 1;

export function playMusic(scene, key, options = {}) {
  const requestedRate = Number.isFinite(options.rate) ? options.rate : 1;
  if (currentKey === key && currentMusic) {
    if (requestedRate !== currentRate) {
      currentRate = requestedRate;
      currentMusic.setRate(currentRate);
    }
    if (currentMusic.isPaused) currentMusic.resume();
    else if (!currentMusic.isPlaying) currentMusic.play();
    if (Number.isFinite(options.volume)) currentMusic.setVolume(options.volume);
    return;
  }
  if (currentMusic) {
    currentMusic.stop();
    currentMusic.destroy();
    currentMusic = null;
  }
  currentKey = key;
  currentRate = requestedRate;
  currentMusic = scene.sound.add(key, { loop: true, volume: 0.35, ...options });
  currentMusic.setRate(currentRate);
  currentMusic.play();
}

export function stopMusic() {
  if (!currentMusic) return;
  currentMusic.stop();
  currentMusic.destroy();
  currentMusic = null;
  currentKey = null;
  currentRate = 1;
}

export function bumpMusicRate(multiplier = 1.15) {
  if (!currentMusic) return;
  currentRate *= multiplier;
  currentMusic.setRate(currentRate);
}

// Intro and menu share one music voice, including its playback position.
export function setMusicVolume(volume) { currentMusic?.setVolume(Math.max(0, Math.min(1, volume))); }
export function pauseMusic() { if (currentMusic?.isPlaying) currentMusic.pause(); }
export function resumeMusic() { if (currentMusic?.isPaused) currentMusic.resume(); }
