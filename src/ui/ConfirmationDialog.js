// One confirmation flow for keyboard, touch and the portable action bar.
export function showConfirmation(scene, message, onYes, { pause = true, onClose } = {}) {
  if (scene.confirmation?.isOpen) return scene.confirmation;
  const previous = { paused: scene.isPaused, clock: scene.time?.paused, dialog: scene.isDialogOpen };
  const container = scene.add.container(0, 0).setDepth(1000).setScrollFactor(0);
  const panel = scene.add.rectangle(480, 300, 670, 240, 0x233c30, .99).setStrokeStyle(3, 0xd5b66e);
  const shade = scene.add.rectangle(480, 300, 960, 600, 0x08130e, .78).setInteractive();
  const text = scene.add.text(480, 253, message.replace(/\n?\[J\]a oder \[N\]ein/g, ''), {
    fontFamily: 'Georgia, serif', fontSize: '25px', color: '#fff0c7', align: 'center', wordWrap: { width: 610 },
  }).setOrigin(.5);
  container.add([shade, panel, text]);
  if (pause) { scene.isPaused = true; if (scene.time) scene.time.paused = true; scene.physics?.world?.pause(); scene.player?.body?.setVelocity(0, 0); }
  scene.isDialogOpen = true;
  const dialog = { isOpen: true, choose(yes) {
    if (!dialog.isOpen) return;
    dialog.isOpen = false;
    scene.confirmation = null; container.destroy(true);
    scene.isDialogOpen = previous.dialog || false;
    if (pause) { scene.isPaused = previous.paused || false; scene.time.paused = previous.clock || false; if (!previous.paused) scene.physics?.world?.resume(); }
    onClose?.(); if (yes) onYes();
  } };
  for (const [yes, x, label] of [[true, 340, 'Ja · {yes}'], [false, 620, 'Nein · {no}']]) {
    const button = scene.add.text(x, 350, label, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '22px',
      color: '#fff1c5', backgroundColor: yes ? '#6a5635' : '#345540', padding: { x: 20, y: 14 } })
      .setOrigin(.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => dialog.choose(yes));
    container.add(button);
  }
  container.setScrollFactor(0); container.list.forEach(child => child.setScrollFactor(0));
  scene.events.once('shutdown', () => { dialog.isOpen = false; container.destroy(true); scene.confirmation = null; });
  scene.confirmation = dialog; return dialog;
}

export function showExitConfirmation(scene, destination) {
  if (scene.inventoryOpen || scene.inventoryOverlay?.isOpen || scene.isGameOver || scene.isComplete || scene.levelCompleted) return;
  return showConfirmation(scene, 'Willst du das Level wirklich verlassen?', () => {
    scene.saveState?.(); scene.scene.start(destination, {});
  });
}
