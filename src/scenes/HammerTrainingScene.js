import { saveProgress } from '../saveManager.js';
import { HAMMER_DRILLS, hammerTrainingFeedback, withHammerTrainingState } from '../utils/hammerRules.js';
import { getAttackStats, applyWeaponAppearance } from '../utils/weapons.js';
import HammerCharge, { applyHammerWave } from '../utils/HammerCharge.js';
import MeleeAnimation from '../utils/MeleeAnimation.js';
import { resetSceneKeys } from '../utils/PortableControls.js';

const style = { fontFamily: 'Trebuchet MS, sans-serif', color: '#fff0c5', stroke: '#172b38', strokeThickness: 3 };
const FLOOR = 480;

export default class HammerTrainingScene extends Phaser.Scene {
  constructor() { super({ key: 'HammerTrainingScene' }); }
  init(data = {}) { this.returnScene = data.returnScene || 'UndergroundShopScene'; this.resumeScene = data.resumeScene; }
  create() {
    this.gameMode = 'jump'; this.worldTime = 0; this.isPaused = false; this.isComplete = false;
    this.equipped = { weapon: 'powerHammer' }; this.inventory = { weapons: { powerHammer: true }, passives: {}, consumables: {} };
    this.facingX = 1; this.isDucking = false; this.isSwinging = false; this.hammerSlamActive = false;
    this.swingHits = new Set(); this.hammerAttack = null; this.retryMessage = null;
    this.attackInputLocked = true; this.drillIndex = 0; this.leaving = false;
    this.add.image(480, 300, 'underground-bg').setDisplaySize(960, 600).setDepth(-10).setAlpha(.45);
    this.add.rectangle(480, 300, 960, 600, 0x192d3b, .72).setDepth(-9);
    this.add.rectangle(480, 530, 960, 100, 0x594736).setDepth(-2);
    const floor = this.add.graphics().setDepth(-1);
    for (let x = 0; x < 960; x += 80) { floor.lineStyle(2, 0x2e2723, .7); floor.lineBetween(x, FLOOR, x, 580); }
    floor.lineStyle(4, 0xbaa36c, .8).lineBetween(0, FLOOR, 960, FLOOR);
    const ground = this.add.rectangle(480, 495, 960, 30, 0, 0); this.physics.add.existing(ground, true);
    this.player = this.physics.add.image(330, FLOOR + 1.8, 'knight-hammer-standing').setOrigin(.5, 1).setScale(.6).setDepth(10);
    applyWeaponAppearance(this);
    this.player.body.setSize(50, 108, false).setOffset(49, 39).setGravityY(900).setCollideWorldBounds(true);
    this.physics.add.collider(this.player, ground);
    this.swordHitbox = this.add.rectangle(0, 0, 60, 44, 0, 0).setVisible(false);
    this.dummy = this.add.image(405, FLOOR, 'training-dummy').setOrigin(.5, 1).setDisplaySize(85, 112).setDepth(8);
    this.demoDummy = this.add.image(750, FLOOR, 'training-dummy').setOrigin(.5, 1).setDisplaySize(85, 112).setDepth(8);
    this.add.ellipse(330, FLOOR + 2, 37, 9, 0xffdf6b, .5).setDepth(1);
    this.add.ellipse(675, FLOOR + 2, 37, 9, 0xffa362, .4).setDepth(1);
    this.add.text(330, 505, 'Du', { ...style, fontSize: '19px' }).setOrigin(.5);
    this.add.text(675, 505, 'Meister Muck', { ...style, fontSize: '19px' }).setOrigin(.5);
    this.add.text(480, 24, 'HAMMERSTUNDE MIT MEISTER MUCK', { ...style, fontFamily: 'Georgia, serif', fontSize: '27px' }).setOrigin(.5, 0);
    this.lessonTitle = this.add.text(480, 72, '', { ...style, fontSize: '21px', fontStyle: 'bold' }).setOrigin(.5);
    this.add.rectangle(480, 174, 870, 140, 0x203e4a, .98).setStrokeStyle(2, 0xbaa36c).setDepth(30);
    this.lessonText = this.add.text(78, 124, '', { ...style, fontSize: '21px', lineSpacing: 6, wordWrap: { width: 805 } }).setDepth(31);
    this.turnText = this.add.text(480, 280, '', { ...style, fontSize: '25px', fontStyle: 'bold' }).setOrigin(.5).setDepth(31);
    this.progressDots = HAMMER_DRILLS.map((_, i) => this.add.circle(432 + i * 24, 320, 6, 0x60717a).setDepth(31));
    this.add.text(480, 557, '{move}: Bewegen · {attack}: antippen / halten / loslassen · {jump}: Springen · ↓: Hammerschlag',
      { ...style, fontSize: '14px', align: 'center', wordWrap: { width: 880 } }).setOrigin(.5).setDepth(31);
    this.exit = this.add.text(920, 29, 'Später', { ...style, fontSize: '17px' }).setOrigin(1, 0)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.finish(false));
    this.doneButton = this.add.text(480, 367, 'Weiter ins Abenteuer · {confirm}', { ...style, fontSize: '22px',
      backgroundColor: '#386350', padding: { x: 22, y: 12 } }).setOrigin(.5).setDepth(40).setVisible(false)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.finish(true));
    this.cursors = this.input.keyboard.createCursorKeys(); this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-SPACE', () => this.hammerCharge?.press());
    this.input.keyboard.on('keydown-ESC', () => this.finish(this.isComplete));
    this.input.keyboard.on('keydown-ENTER', () => { if (this.isComplete) this.finish(true); });
    this.createMentor();
    this.beginDrill();
    const pauseCoach = () => this.mentor.hammerCharge.stopEffects();
    this.events.on('pause', pauseCoach);
    this.events.once('shutdown', () => {
      this.events.off('pause', pauseCoach); this.mentor.hammerCharge.destroy(); this.mentor.meleeAnimation.destroy();
    });
  }
  createMentor() {
    const p = this.add.image(675, FLOOR + 1.8, 'melee-trainer-stand-0').setOrigin(.5, 1).setScale(.6).setDepth(10);
    p.setData('standingTexture', 'melee-trainer-stand-0'); p.setData('crouchTexture', 'melee-trainer-stand-0');
    const m = this.mentor = {
      sys: { settings: { key: 'HammerMentor' } }, gameMode: 'jump', meleeVisualType: 'trainer', meleeIdle: true,
      add: this.add, registry: this.registry, textures: this.textures, tweens: this.tweens, sound: this.sound, cameras: this.cameras,
      time: this.time, worldTime: 0, player: p, equipped: { weapon: 'powerHammer' }, facingX: 1, isDucking: false, isSwinging: false,
      swordHitbox: { getBounds: () => this.boundsFor(p) },
      startSwing: attack => {
        m.hammerAttack = attack; m.isSwinging = true; m.swingStartedAt = this.worldTime; m.swingVisualKind = 'swing';
        const stats = getAttackStats('powerHammer', attack); m.swingReadyAt = this.worldTime + stats.windupMs;
        m.swingUntil = this.worldTime + stats.swingMs; m.impactDone = false; return true;
      },
    };
    m.hammerCharge = new HammerCharge(m); m.meleeAnimation = new MeleeAnimation(m);
  }
  boundsFor(player) { return new Phaser.Geom.Rectangle(player.x, (player.body?.bottom ?? player.y) - 65, 60, 44); }
  getMeleeBounds() { return this.boundsFor(this.player); }
  startSwing(attack = null) {
    if (this.attackInputLocked || this.isSwinging || this.hammerSlamActive) return false;
    const stats = getAttackStats('powerHammer', attack);
    this.hammerAttack = attack; this.isSwinging = true; this.swingVisualKind = 'swing'; this.swingStartedAt = this.worldTime;
    this.swingReadyAt = this.worldTime + stats.windupMs; this.swingUntil = this.worldTime + stats.swingMs;
    this.swingHits = new Set(); this.impactDone = false; this.player.setFlipX(this.facingX > 0); return true;
  }
  activateHammerSlam() {
    if (this.attackInputLocked || this.player.body.blocked.down || this.hammerSlamActive) return;
    this.hammerCharge?.cancel(); this.hammerAttack = null; this.hammerSlamActive = true; this.isSwinging = true;
    this.swingStartedAt = this.worldTime; this.swingVisualKind = 'slam'; this.player.body.setVelocityY(550);
  }
  beginDrill() {
    if (this.drillIndex >= HAMMER_DRILLS.length) { this.completeTraining(); return; }
    const drill = HAMMER_DRILLS[this.drillIndex];
    this.hammerCharge?.cancel(); this.isSwinging = false; this.hammerSlamActive = false;
    this.attackInputLocked = true; this.phase = 'demo'; this.phaseStartedAt = this.worldTime; this.demoReleased = false; this.demoLanded = false;
    // reset() also resets Arcade's previous position. Resyncing the body again
    // during update would add the hitbox offset as movement in postUpdate and
    // push the hero through the floor on the next drill.
    this.player.body.reset(330, FLOOR + 1.8); this.player.body.setVelocity(0, 0);
    this.facingX = 1; this.player.setFlipX(true);
    this.lessonTitle.setText((this.drillIndex + 1) + ' / ' + HAMMER_DRILLS.length + ' · ' + drill.title);
    this.lessonText.setText(this.retryMessage || (this.drillIndex === 0 ? 'Ich bin Meister Muck. Ein guter Hammer braucht Gefühl!\n' : '') + drill.text);
    this.retryMessage = null;
    this.turnText.setText('Meister Muck macht es vor …').setColor('#ffd184');
    this.progressDots.forEach((dot, i) => dot.setFillStyle(i < this.drillIndex ? 0x88de9c : i === this.drillIndex ? 0xffd871 : 0x60717a));
    const m = this.mentor; m.hammerCharge.cancel(); m.isSwinging = false; m.hammerSlamActive = false; m.player.setPosition(675, FLOOR + 1.8);
    m.worldTime = this.worldTime;
    if (drill.id === 'slam') { m.isSwinging = true; m.hammerSlamActive = true; m.swingStartedAt = this.worldTime; m.swingVisualKind = 'slam'; }
    else m.hammerCharge.press();
  }
  beginPractice() {
    this.phase = 'practice'; this.attackInputLocked = false; resetSceneKeys(this);
    this.turnText.setText('Jetzt bist du dran!').setColor('#a7f1b4');
  }
  hitDummy(dummy, attack) {
    this.tweens.killTweensOf(dummy);
    dummy.setAngle(0);
    this.tweens.add({ targets: dummy, angle: (attack?.multiplier || 1) * 5, duration: 75, yoyo: true, repeat: 1 });
    this.sound.play('sfx-stone-hit', { volume: .18 });
    const word = this.add.text(dummy.x, FLOOR - 125, attack?.superCharge ? 'KRACH!' : 'Bumm!', {
      ...style, color: attack?.superCharge ? '#83deff' : '#ffe1a3', fontSize: attack?.superCharge ? '25px' : '18px' }).setOrigin(.5).setDepth(25);
    this.tweens.add({ targets: word, y: word.y - 20, alpha: 0, duration: 550, onComplete: () => word.destroy() });
  }
  resolvePractice(id, hit) {
    if (this.phase !== 'practice') return;
    const feedback = hammerTrainingFeedback(HAMMER_DRILLS[this.drillIndex].id, id, hit);
    this.retryMessage = feedback;
    this.phase = feedback ? 'retry' : 'success'; this.phaseStartedAt = this.worldTime; this.attackInputLocked = true;
    this.hammerCharge?.cancel(); resetSceneKeys(this);
    this.lessonText.setText(feedback || ['Genau! Ein schneller Schlag hilft auch im Sprung.', 'Prima! Du hast die gelben Funken erwischt.',
      'Sehr gut! Das war ein richtiger Power-Schlag.', 'Wunderbar! Blaue Blitze, starker Schlag und Druckwelle.',
      'Saubere Landung! Den Sprung-Hammerschlag behältst du natürlich.'][this.drillIndex]);
    this.turnText.setText(feedback ? 'Schau noch einmal zu …' : 'Geschafft!').setColor(feedback ? '#ffcc9c' : '#a7f1b4');
  }
  completeTraining() {
    this.phase = 'complete'; this.attackInputLocked = true; this.isComplete = true; this.hammerCharge?.cancel();
    this.lessonTitle.setText('Hammerstunde geschafft!');
    this.lessonText.setText('Antippen, gelb, rot oder blau – du bestimmst die Kraft.\nBeim Aufladen gehst du etwas langsamer. Dein Sprungschlag bleibt bereit!\nRüste den Hammer im Inventar aus · {inventory}.');
    this.turnText.setText('Meister Muck ist stolz auf dich.').setColor('#a7f1b4');
    this.progressDots.forEach(dot => dot.setFillStyle(0x88de9c)); this.doneButton.setVisible(true); this.exit.setVisible(false);
    const next = withHammerTrainingState(this.registry.get('saveData') || {}, { offered: true, completed: true });
    this.registry.set('saveData', next); saveProgress(next);
  }
  finish(completed) {
    if (this.leaving) return; this.leaving = true; this.hammerCharge?.cancel();
    resetSceneKeys(this);
    if (this.resumeScene) {
      const parent = this.scene.get(this.resumeScene); parent.attackInputLocked = false; resetSceneKeys(parent);
      this.scene.stop(); this.scene.resume(this.resumeScene);
    } else this.scene.start(this.returnScene);
  }
  update(_time, delta) {
    if (this.isPaused) return;
    const dt = Math.min(.05, delta / 1000); this.worldTime += dt * 1000;
    const m = this.mentor, drill = HAMMER_DRILLS[Math.min(this.drillIndex, HAMMER_DRILLS.length - 1)]; m.worldTime = this.worldTime;
    if (this.phase === 'demo') {
      if (drill.id === 'slam') {
        const progress = Math.min(1, (this.worldTime - this.phaseStartedAt) / 720);
        m.player.y = FLOOR + 1.8 - Math.sin(progress * Math.PI) * 105;
        if (progress === 1 && !this.demoLanded) {
          this.demoLanded = true; m.hammerSlamActive = false; m.hammerAttack = null; m.swingVisualKind = 'landing';
          m.swingStartedAt = this.worldTime; m.swingUntil = this.worldTime + 320; m.swingReadyAt = Infinity;
          applyHammerWave(m, { multiplier: 1.5 }); this.hitDummy(this.demoDummy);
        }
      } else {
        m.hammerCharge.update(dt);
        if (!this.demoReleased && m.hammerCharge.elapsed >= drill.holdMs) { m.hammerCharge.release(); this.demoReleased = true; }
      }
      const demoMs = drill.id === 'slam' ? 1600 : drill.holdMs + 950;
      if (this.worldTime - this.phaseStartedAt > demoMs) this.beginPractice();
    } else if (this.phase === 'retry' && this.worldTime - this.phaseStartedAt > 1500) this.beginDrill();
    else if (this.phase === 'success' && this.worldTime - this.phaseStartedAt > 1000) { this.drillIndex++; this.beginDrill(); }
    if (m.isSwinging && !m.hammerSlamActive) {
      if (!m.impactDone && this.worldTime >= m.swingReadyAt) { m.impactDone = true; this.hitDummy(this.demoDummy, m.hammerAttack); }
      if (this.worldTime >= m.swingUntil) m.isSwinging = false;
    }
    m.meleeAnimation.update(); m.hammerCharge.drawEffects();
    const b = this.player.body, grounded = b.blocked.down || b.touching.down;
    if (this.phase === 'practice') {
      const direction = (this.cursors.right.isDown || this.wasd.D.isDown ? 1 : 0) - (this.cursors.left.isDown || this.wasd.A.isDown ? 1 : 0);
      b.setVelocityX(direction * 180 * (this.hammerCharge?.moveFactor ?? 1));
      if (direction && !this.isSwinging) { this.facingX = direction; this.player.setFlipX(direction > 0); }
      if ((Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.W)) && grounded) b.setVelocityY(-390);
      if ((Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.wasd.S)) && !grounded) this.activateHammerSlam();
    } else b.setVelocityX(0);
    if (this.hammerSlamActive && grounded && b.velocity.y >= 0) {
      this.hammerSlamActive = false; this.swingVisualKind = 'landing'; this.swingStartedAt = this.worldTime;
      this.swingUntil = this.worldTime + 320; this.swingReadyAt = Infinity; applyHammerWave(this, { multiplier: 1.5 });
      const hit = Math.abs(this.player.x - this.dummy.x) < 110; if (hit) this.hitDummy(this.dummy);
      this.resolvePractice('slam', hit);
    }
    if (this.isSwinging && !this.hammerSlamActive) {
      if (!this.impactDone && this.worldTime >= this.swingReadyAt) {
        this.impactDone = true;
        const hit = this.facingX > 0 && Phaser.Geom.Intersects.RectangleToRectangle(this.getMeleeBounds(),
          new Phaser.Geom.Rectangle(this.dummy.x - 20, FLOOR - 100, 40, 100));
        if (hit) this.hitDummy(this.dummy, this.hammerAttack);
        this.resolvePractice(this.hammerAttack?.id || 'normal', hit);
      }
      if (this.worldTime >= this.swingUntil) this.isSwinging = false;
    }
  }
}
