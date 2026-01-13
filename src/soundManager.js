let currentMusic = null;
let currentKey = null;

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
  currentMusic = scene.sound.add(key, { loop: true, volume: 0.35, ...options });
  currentMusic.play();
}

export function stopMusic() {
  if (!currentMusic) return;
  currentMusic.stop();
  currentMusic.destroy();
  currentMusic = null;
  currentKey = null;
}
