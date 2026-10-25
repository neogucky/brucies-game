import { saveProgress } from '../saveManager.js';
import { CONTROL_PROFILES, DEFAULT_CONTROL_PROFILE, controlProfileId, canonicalCode, actionForKey, keyLabel, actionLabel } from './controlProfiles.js';

const INTERNAL_CODES = { confirm: 'Enter', back: 'Escape', inventory: 'Tab', attack: 'Space',
  left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', jump: 'KeyW',
  potion1: 'KeyT', potion2: 'KeyG', fullscreen: 'KeyF' };
const KEY_CODES = { Enter: 13, Escape: 27, Tab: 9, Space: 32, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39,
  ArrowDown: 40, KeyW: 87, KeyT: 84, KeyG: 71, KeyF: 70, Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52 };
const KEY_NAMES = { Enter: 'ENTER', Escape: 'ESC', Tab: 'TAB', Space: 'SPACE', ArrowLeft: 'LEFT',
  ArrowUp: 'UP', ArrowRight: 'RIGHT', ArrowDown: 'DOWN', KeyW: 'W', KeyT: 'T', KeyG: 'G', KeyF: 'F',
  Digit1: 'ONE', Digit2: 'TWO', Digit3: 'THREE', Digit4: 'FOUR' };
const GAME_KEYS = new Set(['Enter','Escape','Tab','Space','Backspace','ShiftLeft','KeyJ','KeyN','KeyE','KeyQ','KeyI',
  'KeyP','KeyT','KeyG','KeyF','KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Digit1','Digit2','Digit3','Digit4']);
const HELD_ACTIONS = new Set(['left','right','up','down','jump']);

export function resetSceneKeys(scene) {
  const keyboard = scene?.input?.keyboard;
  const keys = new Set([...(keyboard?.keys || []), ...Object.values(scene?.cursors || {}), ...Object.values(scene?.wasd || {})]);
  keys.forEach(key => key?.reset?.()); scene?.player?.body?.setVelocity?.(0, 0);
}

export default class PortableControls {
  constructor(game) {
    this.game = game; this.pausedScene = null; this.buttons = {}; this.touchButtons = {}; this.held = new Set();
    this.toolbar = document.getElementById('game-controls'); this.canvas = game.canvas;
    this.buildToolbar();
    this.down = event => this.onKey(event, true); this.up = event => this.onKey(event, false);
    this.blur = () => this.autoPause(); this.visibility = () => { if (document.hidden) this.autoPause(); };
    document.addEventListener('keydown', this.down, true); document.addEventListener('keyup', this.up, true);
    window.addEventListener('blur', this.blur); document.addEventListener('visibilitychange', this.visibility);
    this.focusPointer = () => this.focus(); this.canvas?.addEventListener('pointerdown', this.focusPointer);
    if (this.canvas) this.canvas.tabIndex = 0;
  }
  getProfile() { return controlProfileId(this.game?.registry?.get('saveData')?.settings?.controlProfile); }
  setProfile(value) {
    const profile = controlProfileId(value), save = this.game.registry.get('saveData'); if (!save) return;
    this.held.clear(); this.game.scene.getScenes(false).forEach(resetSceneKeys);
    const next = { ...save, settings: { ...save.settings, controlProfile: profile } };
    this.game.registry.set('saveData', next); saveProgress(next); this.update(); this.focus();
  }
  activeScene() {
    const scenes = this.game.scene.getScenes(true).filter(s => s.sys.settings.key !== 'BootScene');
    return this.pausedScene || scenes[scenes.length - 1];
  }
  focus() { this.canvas?.focus({ preventScroll: true }); }
  buildToolbar() {
    if (!this.toolbar) return;
    const label = document.createElement('label'); label.className = 'control-profile'; label.textContent = 'Steuerung ';
    this.profileSelect = document.createElement('select'); this.profileSelect.setAttribute('aria-label', 'Steuerungsprofil');
    Object.entries(CONTROL_PROFILES).forEach(([id, profile]) => {
      const option = document.createElement('option'); option.value = id; option.textContent = profile.name; this.profileSelect.appendChild(option);
    });
    this.profileSelect.value = DEFAULT_CONTROL_PROFILE; this.profileSelect.addEventListener('change', () => this.setProfile(this.profileSelect.value));
    label.appendChild(this.profileSelect); this.toolbar.appendChild(label);
    const titles = { confirm: 'Bestätigen', back: 'Zurück', inventory: 'Inventar', shoot: 'Schießen', pause: 'Pause' };
    Object.entries(titles).forEach(([action, title]) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = title; button.dataset.action = action;
      button.addEventListener('click', () => { this.dispatch(action); this.focus(); });
      this.toolbar.appendChild(button); this.buttons[action] = button;
    });
    this.touchPad = document.createElement('nav'); this.touchPad.id = 'touch-controls'; this.touchPad.hidden = true; this.touchPad.setAttribute('aria-label', 'Touchsteuerung');
    const touchButtons = [['left','←'],['up','↑'],['down','↓'],['right','→'],['jump','Springen'],['attack','Angriff'],['potion1','Trank 1'],['potion2','Trank 2']];
    touchButtons.forEach(([action, title]) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = title; button.setAttribute('aria-label', title);
      if (HELD_ACTIONS.has(action)) {
        button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); this.focus(); this.setHeld(action, true); });
        const release = () => this.setHeld(action, false);
        button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
      } else button.addEventListener('click', () => { this.dispatch(action); this.focus(); });
      this.touchPad.appendChild(button); this.touchButtons[action] = button;
    });
    this.toolbar.after(this.touchPad);
    this.overlay = document.createElement('div'); this.overlay.id = 'game-pause'; this.overlay.hidden = true;
    this.overlay.setAttribute('role', 'dialog'); this.overlay.setAttribute('aria-label', 'Spiel pausiert');
    const title = document.createElement('h2'); title.textContent = 'Pause';
    this.resumeButton = document.createElement('button'); this.resumeButton.type = 'button';
    this.resumeButton.addEventListener('click', () => { this.resume(); this.focus(); });
    const exit = document.createElement('button'); this.exitButton = exit; exit.type = 'button'; exit.textContent = 'Level verlassen';
    exit.addEventListener('click', () => { this.dispatch('back'); this.focus(); });
    this.overlay.append(title, this.resumeButton, exit); document.getElementById('play-shell')?.appendChild(this.overlay);
  }
  update() {
    if (!this.canvas && this.game.canvas) { this.canvas = this.game.canvas; this.canvas.tabIndex = 0; this.canvas.addEventListener('pointerdown', this.focusPointer); }
    const scene = this.activeScene(); if (!scene) return;
    if (scene !== this.lastScene) { resetSceneKeys(this.lastScene); this.held?.clear(); this.lastScene = scene; }
    if (!this.toolbar) return;
    const profile = this.getProfile(), touch = profile === 'ipadTouch', intro = Boolean(scene.isIntro);
    this.profileSelect.disabled = !this.game.registry.get('saveData'); this.profileSelect.value = profile;
    this.touchPad.hidden = !touch || intro; document.body.classList.toggle('touch-profile', touch && !intro);
    document.body.classList.toggle('cinematic-mode', intro);
    ['inventory', 'shoot', 'pause'].forEach(action => { this.buttons[action].hidden = intro; });
    const disabled = (button, value) => { button.disabled = Boolean(value); };
    disabled(this.buttons.inventory, this.pausedScene || scene.confirmation?.isOpen || scene.inventoryOverlay?.isOpen || scene.dialog?.container?.visible || !scene.toggleInventory || scene.isGameOver || scene.levelCompleted || scene.isComplete);
    disabled(this.buttons.shoot, this.pausedScene || !scene.bow?.equipped() || scene.bow?.isBlocked());
    disabled(this.buttons.pause, !this.pausedScene && (!scene.player || scene.isPaused || scene.isGameOver || scene.levelCompleted || scene.isComplete));
    const asking = scene.confirmation?.isOpen;
    const won = !scene.isGameOver && (scene.levelCompleted || scene.isComplete);
    disabled(this.buttons.back, won || (scene.sys.settings.key === 'MainMenuScene' && !asking && !scene.settingsBox?.visible));
    disabled(this.buttons.confirm, Boolean(this.pausedScene || (intro && scene.started && !scene.suspended)));
    Object.entries(this.touchButtons).forEach(([action, button]) => {
      button.hidden = ['jump','attack','potion1','potion2'].includes(action) && !scene.player;
      button.disabled = Boolean(this.pausedScene || scene.confirmation?.isOpen || scene.isGameOver || scene.levelCompleted || scene.isComplete
        || (action === 'attack' && scene.climbingVine));
    });
    this.buttons.confirm.textContent = intro && scene.started && !scene.suspended ? 'Intro läuft …'
      : actionLabel(profile, 'confirm', intro ? scene.suspended ? 'Fortsetzen' : 'Intro starten' : asking ? 'Ja' : 'Bestätigen');
    this.buttons.back.textContent = actionLabel(profile, 'back', intro ? 'Überspringen' : asking ? 'Nein' : 'Zurück');
    this.buttons.inventory.textContent = actionLabel(profile, 'inventory', 'Inventar');
    this.buttons.shoot.textContent = actionLabel(profile, 'shoot', 'Schießen');
    this.buttons.pause.textContent = actionLabel(profile, 'pause', this.pausedScene ? 'Fortsetzen' : 'Pause');
    this.resumeButton.textContent = actionLabel(profile, 'pause', 'Weiterspielen');
    this.exitButton.textContent = actionLabel(profile, 'back', 'Level verlassen');
    const hint = document.querySelector('.controls-hint');
    if (hint) hint.textContent = touch ? 'Bewegen und klettern: Richtungsknöpfe · Zweimal ↓: durch Plattform · Springen / Angriff: antippen'
      : 'Bewegen: Pfeile · Angriff: ' + keyLabel(profile, 'attack') + ' · Bestätigen: ' + keyLabel(profile, 'confirm') + ' · Zurück: ' + keyLabel(profile, 'back') + ' · Inventar: ' + keyLabel(profile, 'inventory');
    if (hint && intro) hint.textContent = 'Eine kleine Geschichte vor dem Abenteuer · ' + actionLabel(profile, 'back', 'Überspringen');
    this.canvas?.setAttribute('aria-label', 'Brucies Spiel. ' + CONTROL_PROFILES[profile].name + '. ' + this.buttons.confirm.textContent + '. ' + this.buttons.back.textContent + '.');
  }
  emitKey(scene, code) {
    const keyboard = scene?.input?.keyboard; if (!keyboard) return;
    const event = { code, key: code, keyCode: KEY_CODES[code] || 0, which: KEY_CODES[code] || 0,
      repeat: false, timeStamp: performance.now(), preventDefault() {}, stopPropagation() {} };
    keyboard.emit('keydown', event); keyboard.emit('keydown-' + (KEY_NAMES[code] || code.replace('Key', '')), event);
  }
  dispatch(action, targetScene = this.activeScene()) {
    if (this.pausedScene) {
      const pausedScene = this.pausedScene;
      if (action === 'pause') this.resume();
      else if (action === 'back') { this.resume(); this.dispatch('back', pausedScene); }
      return;
    }
    const s = targetScene; if (!s) return;
    if (s.isIntro) {
      if (action === 'confirm') s.startIntro();
      else if (action === 'back') s.finish();
      else if (action === 'fullscreen') this.emitKey(s, 'KeyF');
      return;
    }
    if (s.confirmation?.isOpen) { if (['confirm','back'].includes(action)) s.confirmation.choose(action === 'confirm'); return; }
    if (s.settingsActions && s.settingsBox?.visible) { s.settingsActions[action]?.(); return; }
    if (action === 'pause') { this.pause(s); return; }
    if (s.inventoryOverlay?.isOpen) {
      if (action === 'confirm') { if (s.inventoryOverlay.confirm) s.inventoryOverlay.confirm(); else s.inventoryOverlay.applySelection(); }
      if (action === 'back') { s.inventoryOverlay.close(); s.inventoryOverlay.onClose?.(); }
      return;
    }
    if (s.dialog?.container?.visible) {
      if (action === 'back') s.dialog.hide();
      else if (action === 'confirm') { const page = s.dialog.pages[s.dialog.index]; if (page?.options?.length) s.dialog.selectOption(page.options); else s.dialog.nextPage(); }
      return;
    }
    if (action === 'inventory') { s.toggleInventory?.(); return; }
    if (action === 'shoot') { s.bow?.tryShoot(); return; }
    if (action === 'back' && s.isDialogOpen && s.isPaused && !s.isGameOver && !s.levelCompleted) { this.emitKey(s, 'Escape'); return; }
    if (action === 'back' && (s.isGameOver || s.levelCompleted || s.isComplete)) {
      if (!s.isGameOver) return;
      const map = s.sys.settings.key === 'JungleScene' ? 'JungleMapScene' : s.sys.settings.key === 'UndergroundDigScene' ? 'UndergroundMapScene'
        : ['DesertRuinScene','DesertEndlessScene','DesertTunnelScene'].includes(s.sys.settings.key) ? 'DessertMapScene' : null;
      if (map) {
        if (s.restoreAfterDefeat) s.restoreAfterDefeat();
        else { s.health = s.maxHealth || 5; s.companionHealth = 1; s.companionRespawnAt = 0; s.saveInventory?.(); s.saveState?.(); }
        s.time.paused = false; s.scene.start(map); return;
      }
    }
    const code = INTERNAL_CODES[action]; if (code) this.emitKey(s, code);
  }
  setHeld(action, down) {
    const scene = this.activeScene(); if (!scene || this.pausedScene) return;
    const code = INTERNAL_CODES[action];
    const key = ({ left: scene.cursors?.left, right: scene.cursors?.right, up: scene.cursors?.up, down: scene.cursors?.down, jump: scene.wasd?.W })[action];
    const normalized = { keyCode: KEY_CODES[code], timeStamp: performance.now(), altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, repeat: false };
    if (down) {
      if (this.held?.has(action)) return; this.held?.add(action);
      if (scene.confirmation?.isOpen) return;
      if (scene.settingsActions && scene.settingsBox?.visible) { scene.settingsActions[action]?.(); return; }
      if (!scene.inventoryOverlay?.isOpen && !scene.dialog?.container?.visible) key?.onDown?.(normalized);
      this.emitKey(scene, code);
    } else { this.held?.delete(action); key?.onUp?.(normalized); }
  }
  onKey(event, down) {
    const target = event.target;
    if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || '') || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    const scene = this.activeScene(); if (!scene) return;
    const code = canonicalCode(event), profile = this.getProfile(), action = actionForKey(event, profile);
    if (!action && !GAME_KEYS.has(code)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!action) {
      if (down && !event.repeat && profile === 'pc' && /^Digit[1-4]$/.test(code)) this.emitKey(scene, code);
      return;
    }
    if (HELD_ACTIONS.has(action)) { if (!event.repeat || !down) this.setHeld(action, down); }
    else if (down && !event.repeat) this.dispatch(action);
  }
  pause(scene) {
    if (!scene?.player || scene.isPaused || scene.isGameOver || scene.levelCompleted || scene.isComplete) return;
    resetSceneKeys(scene); this.held?.clear(); this.pausedScene = scene; scene.scene.pause();
    if (this.overlay) { this.overlay.hidden = false; this.resumeButton.focus({ preventScroll: true }); }
  }
  resume() {
    const s = this.pausedScene; if (!s) return;
    resetSceneKeys(s); this.held?.clear(); s.scene.resume(); this.pausedScene = null;
    if (typeof s.worldTime === 'number') s.invulnerableUntil = Math.max(s.invulnerableUntil || 0, s.worldTime + 1000);
    s.player?.setData?.('invulnerableUntil', Math.max(s.player?.getData?.('invulnerableUntil') || 0, s.time.now + 1000));
    if (this.overlay) this.overlay.hidden = true; this.focus();
  }
  autoPause() {
    const s = this.activeScene(); resetSceneKeys(s); this.held?.clear();
    if (s?.isIntro) { s.suspendIntro(); return; }
    if (!this.pausedScene) this.pause(s);
  }
  destroy() {
    document.removeEventListener('keydown', this.down, true); document.removeEventListener('keyup', this.up, true);
    window.removeEventListener('blur', this.blur); document.removeEventListener('visibilitychange', this.visibility);
    this.canvas?.removeEventListener('pointerdown', this.focusPointer);
    this.overlay?.remove(); this.touchPad?.remove(); this.toolbar?.replaceChildren();
  }
}
