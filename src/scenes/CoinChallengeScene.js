import { BONUS_CHALLENGES, BONUS_DURATION, bonusState, beginBonus, checkpointBonus, finishBonus, createBonusLayout } from '../utils/bonusChallenges.js';
import { saveProgress } from '../saveManager.js';
import { playMusic } from '../soundManager.js';
import { showConfirmation } from '../ui/ConfirmationDialog.js';

const type = { fontFamily: 'Trebuchet MS, sans-serif', color: '#fff1cd' };
export default class CoinChallengeScene extends Phaser.Scene {
  constructor() { super({ key: 'CoinChallengeScene' }); }
  init(data) { this.bonusWorld = Object.hasOwn(BONUS_CHALLENGES, data?.world) ? data.world : 'desert'; }
  create() {
    this.config = BONUS_CHALLENGES[this.bonusWorld]; this.layout = createBonusLayout(this.bonusWorld);
    let state = bonusState(this.registry.get('saveData') || {}, this.bonusWorld);
    if (state.status === 'running' && state.remainingMs <= 0) {
      const next = finishBonus(this.registry.get('saveData') || {}, this.bonusWorld);
      this.registry.set('saveData', next); saveProgress(next); state = bonusState(next, this.bonusWorld);
    }
    const validCoins = new Set(this.layout.coins.map(coin => coin.id));
    this.remainingMs = state.remainingMs ?? BONUS_DURATION; this.collected = new Set((state.collected || []).filter(id => validCoins.has(id)));
    this.running = false; this.counting = false; this.isPaused = false; this.levelCompleted = false; this.isComplete = false;
    this.climbing = null; this.nextSpring = 0; this.lastPersist = 0; this.lastFrameAt = performance.now();
    this.dropThroughY = null; this.dropUntil = 0; this.lastDownAt = -1000;
    this.createLandscape(); this.createPlayer(state); this.createCoins(); this.createHud();
    this.cursors = this.input.keyboard.createCursorKeys(); this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    for (const key of ['DOWN', 'S']) this.input.keyboard.on('keydown-' + key, event => { if (!event?.repeat) this.tryDropThrough(); });
    this.input.keyboard.on('keydown-ENTER', () => { if (this.levelCompleted) this.returnToMap(); else if (!this.running && !this.counting) this.startAttempt(); });
    this.input.keyboard.on('keydown-ESC', () => this.requestExit());
    this.input.keyboard.on('keydown-F', () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen(); });
    this.events.on('pause', this.persist, this);
    this.resumeClock = () => { this.lastFrameAt = performance.now(); };
    this.events.on('resume', this.resumeClock);
    this.flushSave = () => this.persist(); window.addEventListener('pagehide', this.flushSave);
    this.events.once('shutdown', () => {
      this.persist(); window.removeEventListener('pagehide', this.flushSave);
      this.events.off('pause', this.persist, this); this.events.off('resume', this.resumeClock);
    });
    playMusic(this, this.bonusWorld === 'underground' ? 'music-underground' : this.bonusWorld === 'desert' ? 'music-desert' : 'music-world');
    this.player.body.setAllowGravity(false); this.physics.pause();
    if (state.status === 'complete') this.showResult();
    else if (state.status === 'locked') this.showLocked();
    else this.showWelcome(state.status === 'running');
  }
  createLandscape() {
    const { width, height, platforms, vines } = this.layout;
    this.add.image(480, 300, this.config.background).setDisplaySize(960, 600).setScrollFactor(0).setDepth(-10);
    this.add.rectangle(480, 300, 960, 600, this.bonusWorld === 'underground' ? 0x123442 : 0x21422c, .15).setScrollFactor(0).setDepth(-9);
    this.physics.world.setBounds(0, 0, width, height); this.cameras.main.setBounds(0, 0, width, height);
    this.platforms = this.physics.add.staticGroup();
    platforms.forEach((p, index) => {
      const texture = this.bonusWorld === 'jungle' ? 'jungle-branch' : this.bonusWorld === 'underground' ? 'underground-stone' : 'underground-earth';
      const ledge = this.platforms.create(p.x + p.width / 2, p.y + 12, texture).setDisplaySize(p.width, 24).setDepth(2).refreshBody();
      ledge.bonusSurfaceY = p.y; ledge.bonusFloor = Boolean(p.floor);
      ledge.body.checkCollision.down = false; ledge.body.checkCollision.left = false; ledge.body.checkCollision.right = false;
      if (this.bonusWorld === 'desert') {
        const pillarHeight = this.layout.platforms[0].y - p.y;
        if (pillarHeight) this.add.rectangle(p.x + p.width / 2, p.y + pillarHeight / 2, p.width - 12, pillarHeight, 0xb78d50, .9).setDepth(-1);
        this.add.rectangle(p.x + p.width / 2, p.y + 5, p.width, 9, 0xe8c681).setDepth(3);
      }
      if (p.spring) this.createSpring(p);
      if (this.bonusWorld === 'jungle' && index) this.add.ellipse(p.x + 15, p.y + 4, 38, 14, 0x559b46).setDepth(3);
    });
    if (this.bonusWorld === 'jungle') {
      for (const x of [52, 908]) this.add.image(x, height, 'jungle-tree').setOrigin(.5, 1).setDisplaySize(260, height + 50).setDepth(-5);
      const g = this.add.graphics().setDepth(1);
      for (const vine of vines) {
        g.lineStyle(7, 0x385426).lineBetween(vine.x, vine.top, vine.x, vine.bottom);
        g.lineStyle(3, 0x80b653).lineBetween(vine.x - 1, vine.top, vine.x - 1, vine.bottom);
        for (let y = vine.top; y < vine.bottom; y += 54) g.fillStyle(0x5b9948).fillEllipse(vine.x + 8, y, 24, 10);
      }
    }
  }
  createSpring(platform) {
    const x = platform.x + platform.width / 2, y = platform.y;
    const art = this.add.container(x, y).setDepth(4), g = this.add.graphics(); art.add(g);
    g.fillStyle(0x152d39, .45).fillEllipse(0, 3, 62, 11)
      .fillStyle(0x496b7c).fillRoundedRect(-26, -4, 52, 9, 3);
    for (const [width, color] of [[7, 0x254350], [3, 0xb5f7ef]]) {
      g.lineStyle(width, color).beginPath().moveTo(0, -5);
      for (let i = 0; i < 6; i++) g.lineTo(i % 2 ? -15 : 15, -8 - i * 4.5);
      g.lineTo(0, -35).strokePath();
    }
    g.fillStyle(0x247e86).fillRoundedRect(-28, -37, 56, 9, 3)
      .fillStyle(0x8bf7e5).fillRoundedRect(-27, -38, 54, 4, 2);
    const cap = this.platforms.create(x, y - 33, '__WHITE').setDisplaySize(52, 8).setVisible(false).refreshBody();
    cap.bonusSpring = true; cap.bonusSurfaceY = y - 37; cap.bonusDropThroughY = y; cap.springArt = art;
    cap.body.checkCollision.down = false; cap.body.checkCollision.left = false; cap.body.checkCollision.right = false;
  }
  createPlayer(state) {
    const save = this.registry.get('saveData') || {}; this.gender = save.playerGender === 'female' ? '-female' : '';
    const { spawn, width, height } = this.layout;
    const x = Number.isFinite(state.x) ? Math.max(35, Math.min(width - 35, state.x)) : spawn.x;
    const y = Number.isFinite(state.y) ? Math.max(65, Math.min(this.layout.platforms[0].y - 3, state.y)) : spawn.y;
    this.player = this.physics.add.sprite(x, y, 'knight' + this.gender + '-standing').setOrigin(.5, 1).setDisplaySize(70, 70).setDepth(10);
    this.player.body.setSize(58, 108).setOffset(46, 37); this.player.setCollideWorldBounds(true).setGravityY(1000);
    const body = this.player.body; body.reset(x, y); body.updateFromGameObject();
    body.prev.copy(body.position); body.prevFrame.copy(body.position); body.autoFrame.copy(body.position);
    this.physics.add.collider(this.player, this.platforms, (_player, ledge) => this.bounceFromSpring(ledge),
      (_player, ledge) => this.canLandOnLedge(ledge));
    this.cameras.main.startFollow(this.player, true, .12, .12);
  }
  canLandOnLedge(ledge) {
    const body = this.player.body;
    return !this.climbing && !(this.time.now < this.dropUntil && Math.abs((ledge.bonusDropThroughY ?? ledge.bonusSurfaceY) - this.dropThroughY) < 3)
      && body.velocity.y >= 0 && body.prev.y + body.height <= ledge.body.top + 12;
  }
  bounceFromSpring(ledge) {
    if (!ledge.bonusSpring || this.time.now < this.nextSpring) return false;
    this.player.setVelocityY(-660); this.nextSpring = this.time.now + 300;
    this.sound.play('sfx-spring', { volume: .6 });
    this.tweens.add({ targets: ledge.springArt, scaleY: .4, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
    return true;
  }
  createCoins() {
    this.coinSprites = this.layout.coins.filter(coin => !this.collected.has(coin.id)).map(coin => ({ ...coin,
      sprite: this.add.image(coin.x, coin.y, 'ui-coin').setDisplaySize(26, 26).setDepth(5) }));
  }
  tryDropThrough() {
    if (!this.running || this.isPaused || this.levelCompleted) return false;
    const now = this.time.now, body = this.player.body, quick = now - this.lastDownAt <= 300;
    this.lastDownAt = now;
    if (!quick || !(body.blocked.down || body.touching.down)) return false;
    const ledge = this.platforms.getChildren().find(p => !p.bonusFloor && Math.abs(body.bottom - p.body.top) < 10
      && body.right > p.body.x && body.x < p.body.right);
    if (!ledge) return false;
    this.dropThroughY = ledge.bonusDropThroughY ?? ledge.bonusSurfaceY; this.dropUntil = now + 450;
    this.nextSpring = this.dropUntil; this.climbing = null;
    this.player.y += 8; body.position.y += 8; body.updateCenter();
    body.blocked.down = false; body.touching.down = false; this.player.setVelocityY(120);
    return true;
  }
  createHud() {
    this.add.rectangle(480, 28, 960, 56, 0x17323d, .93).setScrollFactor(0).setDepth(20);
    this.add.text(24, 26, this.config.name, { ...type, fontSize: '24px', fontStyle: 'bold' }).setOrigin(0, .5).setScrollFactor(0).setDepth(21);
    this.timerText = this.add.text(480, 26, '', { ...type, fontSize: '30px', fontStyle: 'bold' }).setOrigin(.5).setScrollFactor(0).setDepth(21);
    this.scoreText = this.add.text(936, 26, '', { ...type, fontSize: '24px' }).setOrigin(1, .5).setScrollFactor(0).setDepth(21);
    this.timerBar = this.add.graphics().setScrollFactor(0).setDepth(22); this.updateHud();
  }
  updateHud() {
    this.timerText.setText(Math.ceil(this.remainingMs / 1000) + ' s').setColor(this.remainingMs <= 10000 ? '#ffb298' : '#fff1cd');
    this.scoreText.setText(this.collected.size + ' / ' + this.layout.coins.length + ' Münzen');
    this.timerBar.clear().fillStyle(this.remainingMs <= 10000 ? 0xe98568 : 0xe6c879).fillRect(0, 54, 960 * this.remainingMs / BONUS_DURATION, 4);
  }
  panel(title, text, button, onClick) {
    this.overlay?.destroy(); this.overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(50);
    this.overlay.add(this.add.rectangle(480, 300, 960, 600, 0x10242b, .72).setInteractive());
    this.overlay.add(this.add.rectangle(480, 300, 730, 374, 0x213f43, .99).setStrokeStyle(3, 0xddbf7c));
    this.overlay.add(this.add.text(480, 165, title, { ...type, fontFamily: 'Georgia, serif', fontSize: '34px', fontStyle: 'bold' }).setOrigin(.5));
    this.overlay.add(this.add.text(480, 276, text, { ...type, fontSize: '24px', align: 'center', lineSpacing: 10, wordWrap: { width: 670 } }).setOrigin(.5));
    this.overlay.add(this.add.text(480, 411, button, { ...type, fontSize: '23px', backgroundColor: '#5e7150', padding: { x: 25, y: 12 } })
      .setOrigin(.5).setInteractive({ useHandCursor: true }).on('pointerdown', onClick));
    // Phaser hit testing reads each child's scroll factor separately from its container.
    this.overlay.list.forEach(child => child.setScrollFactor(0));
  }
  showWelcome(resuming) {
    this.panel(this.config.name, (resuming ? 'Dein Versuch geht weiter!\nNoch ' + Math.ceil(this.remainingMs / 1000) + ' Sekunden.' :
      '60 Sekunden · Ein Versuch · Keine Gegner') + '\n\n' + this.config.tip,
    (resuming ? 'Weitersammeln' : 'Los geht’s') + ' · {confirm}', () => this.startAttempt());
    this.overlay.add(this.add.text(480, 465, 'Zur Weltkarte · {back}', { ...type, fontSize: '18px' }).setOrigin(.5).setScrollFactor(0)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.returnToMap()));
  }
  showLocked() {
    this.levelCompleted = true; this.isComplete = true;
    this.panel('Noch verborgen', 'Finde zuerst den versteckten Schalter!', 'Zur Weltkarte · {confirm}', () => this.returnToMap());
  }
  startAttempt() {
    if (this.running || this.counting || this.levelCompleted) return;
    const next = beginBonus(this.registry.get('saveData') || {}, this.bonusWorld); if (!next) return;
    this.registry.set('saveData', next); saveProgress(next); this.overlay?.destroy(); this.overlay = null;
    this.counting = true; this.countdownMs = 3000; this.lastFrameAt = performance.now();
    this.countdownText = this.add.text(480, 280, '3', { ...type, fontSize: '88px', fontStyle: 'bold', stroke: '#17323d', strokeThickness: 6 })
      .setOrigin(.5).setScrollFactor(0).setDepth(40);
  }
  persist() {
    if (!this.running && !this.counting) return;
    const next = checkpointBonus(this.registry.get('saveData') || {}, this.bonusWorld,
      { remainingMs: this.remainingMs, collected: [...this.collected], x: this.player.x, y: this.player.y });
    this.registry.set('saveData', next); saveProgress(next); this.lastPersist = performance.now();
  }
  finish() {
    if (this.levelCompleted) return;
    this.persist(); this.running = false; this.counting = false; this.climbing = null; this.countdownText?.destroy();
    const next = finishBonus(this.registry.get('saveData') || {}, this.bonusWorld);
    this.registry.set('saveData', next); saveProgress(next); this.showResult();
  }
  showResult() {
    this.levelCompleted = true; this.isComplete = true; this.physics.pause(); this.player.setVelocity(0);
    const state = bonusState(this.registry.get('saveData') || {}, this.bonusWorld);
    const result = state.allCollected && Number.isFinite(state.recordMs)
      ? 'Alle ' + this.collected.size + ' Münzen gesammelt!\n\nRekord: ' + Math.ceil(state.recordMs / 1000) + ' Sekunden'
      : this.collected.size + ' Münzen gesammelt!\n\nDieser Versuch ist abgeschlossen.';
    this.panel(state.allCollected ? 'Alles eingesammelt!' : 'Deine Münzjagd', result,
      'Zur Weltkarte · {confirm}', () => this.returnToMap());
  }
  requestExit() {
    if (this.levelCompleted || (!this.running && !this.counting)) { this.returnToMap(); return; }
    showConfirmation(this, 'Münzjagd beenden?\nDein einziger Versuch ist dann vorbei.', () => this.finish());
  }
  returnToMap() {
    if (this.running || this.counting) { this.requestExit(); return; }
    this.scene.start(this.config.map);
  }
  update() {
    const now = performance.now(), elapsed = Math.max(0, now - this.lastFrameAt); this.lastFrameAt = now;
    if (this.isPaused || this.levelCompleted) return;
    if (this.counting) {
      this.countdownMs -= elapsed; this.countdownText.setText(Math.max(1, Math.ceil(this.countdownMs / 1000)));
      if (this.countdownMs <= 0) { this.countdownText.destroy(); this.counting = false; this.running = true; this.player.body.setAllowGravity(true); this.physics.resume(); this.sound.play('sfx-key-open', { volume: .3 }); }
      return;
    }
    if (!this.running) return;
    this.remainingMs = Math.max(0, this.remainingMs - elapsed);
    if (!this.remainingMs) { this.updateHud(); this.finish(); return; }
    const left = this.cursors.left.isDown || this.wasd.A.isDown, right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown, down = this.cursors.down.isDown || this.wasd.S.isDown;
    const body = this.player.body;
    if (up && !this.climbing) this.climbing = this.layout.vines.find(v => Math.abs(this.player.x - v.x) < 22 && body.bottom >= v.top && body.bottom <= v.bottom);
    if (this.climbing && (Math.abs(this.player.x - this.climbing.x) > 22 || body.bottom < this.climbing.top || body.bottom > this.climbing.bottom)) this.climbing = null;
    body.setAllowGravity(!this.climbing); this.player.setVelocityX((right - left) * (this.climbing ? 90 : 245));
    if (this.climbing) this.player.setVelocityY(up ? -190 : down ? 190 : 0);
    else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.W)) {
      if (body.blocked.down || body.touching.down) this.player.setVelocityY(-540);
    }
    if (left || right) this.player.setFlipX(left);
    const frame = Math.floor(this.time.now / 120) % 6;
    this.player.setTexture(this.climbing ? `knight${this.gender}-climb-${frame % 2}` :
      left || right ? `knight${this.gender}-walk-${frame}` : `knight${this.gender}-standing`);
    let picked = false;
    for (const coin of this.coinSprites) if (coin.sprite?.active && Math.hypot(body.center.x - coin.x, body.center.y - coin.y) < 34) {
      coin.sprite.destroy(); this.collected.add(coin.id); picked = true;
    }
    if (picked) this.sound.play('sfx-coin', { volume: .5 });
    if (picked || now - this.lastPersist > 500) this.persist();
    this.updateHud();
    if (this.collected.size === this.layout.coins.length) this.finish();
  }
}
