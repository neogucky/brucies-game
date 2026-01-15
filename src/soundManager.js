let currentMusic = null;
let currentKey = null;
let currentRate = 1;

export function playMusic(scene, key, options = {}) {
  if (currentKey === key && currentMusic && currentMusic.isPlaying) {
    return;
  }
  if (currentMusic) {
    currentMusic.stop();
    currentMusic.destroy();
    currentMusic = null;
  }
  currentKey = key;
  currentRate = options.rate ?? 1;
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
