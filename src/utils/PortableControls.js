import { saveProgress } from '../saveManager.js';
import { controlProfileId, canonicalCode, actionForKey, actionLabel } from './controlProfiles.js';

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
const HELD_ACTIONS = new Set(['left','right','up','down','jump','attack']);

export function resetSceneKeys(scene) {
  const keyboard = scene?.input?.keyboard;
  const keys = new Set([...(keyboard?.keys || []), ...Object.values(scene?.cursors || {}), ...Object.values(scene?.wasd || {})]);
  keys.forEach(key => key?.reset?.()); scene?.player?.body?.setVelocity?.(0, 0);
}

export function controlBarActions(scene, paused = false) {
  if (!scene || paused || scene.isIntro || scene.confirmation?.isOpen || scene.settingsBox?.visible || scene.inventoryOverlay?.isOpen) return [];
  if (scene.dialog?.container?.visible) return ['back'];
  if (scene.isGameOver) return ['confirm', 'back'];
  if (scene.levelCompleted || scene.isComplete) return ['confirm'];
  if (scene.sys.settings.key === 'MainMenuScene') return [];
  const actions = [];
  if (scene.toggleInventory) actions.push('inventory');
  if (scene.player) actions.push('pause');
  if (!scene.player && !scene.currentNode && !scene.toggleInventory) actions.push('confirm');
  actions.push('back');
  return actions;
}

export function mapControlHint(profile, shore = false) {
  if (shore) return profile === 'ipadTouch' ? 'Ufer antippen: hingehen · Schild antippen: Hinweis'
    : 'WASD / Pfeile: Bewegen · ' + actionLabel(profile, 'confirm', 'Zum Wasser');
  return profile === 'ipadTouch' ? 'Ort antippen: hingehen · Erneut antippen: betreten'
    : 'WASD / Pfeile: Bewegen · ' + actionLabel(profile, 'confirm', 'Betreten');
}

export function introSkipLabel(profile) {
  return profile === 'ipadTouch' ? 'Überspringen' : 'Überspringen · Leertaste';
}

export default class PortableControls {
  constructor(game) {
    this.game = game; this.pausedScene = null; this.buttons = {}; this.touchButtons = {}; this.held = new Set(); this.heldKeys = new Map(); this.pressedKeys = new Set();
    this.toolbar = document.getElementById('game-controls'); this.canvas = game.canvas;
    this.buildToolbar();
    this.down = event => this.onKey(event, true); this.up = event => this.onKey(event, false);
    this.blur = () => this.autoPause();
    this.focusIn = () => { const scene = this.activeScene(); if (scene?.isIntro && scene.suspended) scene.startIntro(); };
    this.visibility = () => { if (document.hidden) this.autoPause(); else this.focusIn(); };
    document.addEventListener('keydown', this.down, true); document.addEventListener('keyup', this.up, true);
    window.addEventListener('blur', this.blur); window.addEventListener('focus', this.focusIn); document.addEventListener('visibilitychange', this.visibility);
    this.focusPointer = () => this.focus(); this.canvas?.addEventListener('pointerdown', this.focusPointer);
    if (this.canvas) this.canvas.tabIndex = 0;
  }
  getProfile() { return controlProfileId(this.game?.registry?.get('saveData')?.settings?.controlProfile); }
  setProfile(value) {
    const profile = controlProfileId(value), save = this.game.registry.get('saveData'); if (!save) return;
    this.clearHeld(); this.game.scene.getScenes(false).forEach(resetSceneKeys);
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
    const titles = { confirm: 'Bestätigen', inventory: 'Inventar', pause: 'Pause', back: 'Zurück' };
    Object.entries(titles).forEach(([action, title]) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = title; button.dataset.action = action;
      button.addEventListener('click', () => { this.dispatch(action); this.focus(); });
      this.toolbar.appendChild(button); this.buttons[action] = button;
    });
    this.touchPad = document.createElement('nav'); this.touchPad.id = 'touch-controls'; this.touchPad.hidden = true; this.touchPad.setAttribute('aria-label', 'Touchsteuerung');
    const movement = document.createElement('div'); movement.className = 'touch-move';
    const actions = document.createElement('div'); actions.className = 'touch-actions';
    this.touchPad.append(movement, actions);
    const touchButtons = [['left','←'],['up','↑'],['down','↓'],['right','→'],['jump','Springen'],['attack','Angriff'],['shoot','Bogen'],['potion1','Trank 1'],['potion2','Trank 2']];
    touchButtons.forEach(([action, title]) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = title; button.setAttribute('aria-label', title); button.dataset.action = action;
      if (HELD_ACTIONS.has(action)) {
        button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); this.focus(); this.setHeld(action, true); });
        const release = () => this.setHeld(action, false);
        const cancel = () => {
          if (action !== 'attack') { release(); return; }
          this.attackScene?.hammerCharge?.cancel(); this.attackScene = null; this.held.delete('attack');
        };
        button.addEventListener('pointerup', release); button.addEventListener('pointercancel', cancel); button.addEventListener('lostpointercapture', cancel);
      } else button.addEventListener('click', () => { this.dispatch(action); this.focus(); });
      (['left','up','down','right'].includes(action) ? movement : actions).appendChild(button); this.touchButtons[action] = button;
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
    if (scene !== this.lastScene) { resetSceneKeys(this.lastScene); this.clearHeld(); this.lastScene = scene; }
    if (!this.toolbar) return;
    const profile = this.getProfile(), touch = profile === 'ipadTouch', intro = Boolean(scene.isIntro);
    const modal = scene.confirmation?.isOpen || scene.inventoryOverlay?.isOpen || scene.dialog?.container?.visible || scene.settingsBox?.visible;
    const finished = scene.isGameOver || scene.levelCompleted || scene.isComplete;
    const showTouch = Boolean(touch && scene.player && !modal && !finished && !this.pausedScene);
    this.touchPad.hidden = !showTouch; document.body.classList.toggle('touch-profile', showTouch);
    document.body.classList.toggle('cinematic-mode', intro);
    if (scene.currentNode && scene.hintText) {
      const hint = mapControlHint(profile, scene.sys.settings.key === 'WaterMapScene');
      if (scene.hintText.text !== hint) scene.hintText.setText(hint);
    }
    const actions = new Set(controlBarActions(scene, Boolean(this.pausedScene)));
    Object.entries(this.buttons).forEach(([action, button]) => { button.hidden = !actions.has(action); });
    this.toolbar.hidden = actions.size === 0;
    document.body.classList.toggle('has-action-bar', actions.size > 0);
    const disabled = (button, value) => { button.disabled = Boolean(value); };
    disabled(this.buttons.inventory, this.pausedScene || scene.confirmation?.isOpen || scene.inventoryOverlay?.isOpen || scene.dialog?.container?.visible || !scene.toggleInventory || scene.isGameOver || scene.levelCompleted || scene.isComplete);
    disabled(this.buttons.pause, !this.pausedScene && (!scene.player || scene.isPaused || scene.isGameOver || scene.levelCompleted || scene.isComplete));
    const asking = scene.confirmation?.isOpen;
    const won = !scene.isGameOver && (scene.levelCompleted || scene.isComplete);
    disabled(this.buttons.back, won || (scene.sys.settings.key === 'MainMenuScene' && !asking && !scene.settingsBox?.visible));
    disabled(this.buttons.confirm, Boolean(this.pausedScene || (intro && scene.started && !scene.suspended)));
    Object.entries(this.touchButtons).forEach(([action, button]) => {
      const potion = action === 'potion1' ? scene.equipped?.consumable : scene.equipped?.consumable2;
      if (action === 'attack') {
        button.textContent = scene.equipped?.weapon === 'powerHammer' ? 'Hammer' : 'Angriff';
        button.setAttribute('aria-label', scene.equipped?.weapon === 'powerHammer' ? 'Hammer, halten zum Aufladen' : 'Angriff');
      }
      button.hidden = action === 'shoot' ? !scene.bow?.equipped()
        : action.startsWith('potion') ? !potion || !scene.inventory?.consumables?.honey : false;
      button.disabled = Boolean(this.pausedScene || scene.confirmation?.isOpen || scene.isGameOver || scene.levelCompleted || scene.isComplete
        || (['attack','shoot'].includes(action) && scene.climbingVine));
    });
    this.buttons.confirm.textContent = actionLabel(profile, 'confirm', asking ? 'Ja' : 'Bestätigen');
    this.buttons.back.textContent = actionLabel(profile, 'back', asking ? 'Nein'
      : scene.dialog?.container?.visible ? 'Schließen' : scene.currentNode ? 'Menü' : scene.player && !finished ? 'Verlassen' : 'Zurück');
    this.buttons.inventory.textContent = actionLabel(profile, 'inventory', 'Inventar');
    this.buttons.pause.textContent = actionLabel(profile, 'pause', this.pausedScene ? 'Fortsetzen' : 'Pause');
    this.resumeButton.textContent = actionLabel(profile, 'pause', 'Weiterspielen');
    this.exitButton.textContent = actionLabel(profile, 'back', 'Level verlassen');
    if (intro) {
      const label = introSkipLabel(profile);
      if (scene.skipButton?.text !== label) scene.skipButton?.setText(label);
      this.canvas?.setAttribute('aria-label', 'Spielintro. ' + label + '.');
    } else this.canvas?.setAttribute('aria-label', 'Brucies Spiel. ' + this.buttons.confirm.textContent + '. ' + this.buttons.back.textContent + '.');
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
      if (action === 'attack' || action === 'confirm') s.finish();
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
    if (action === 'attack' && s.hammerCharge) { s.hammerCharge.press(); return; }
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
    if (action === 'attack') {
      this.held ||= new Set();
      if (down) {
        if (this.held.has(action)) return;
        this.held.add(action); this.attackScene = scene; this.dispatch(action, scene);
      } else {
        this.held.delete(action);
        const owner = this.attackScene; this.attackScene = null;
        if (owner === scene) owner?.hammerCharge?.release(); else owner?.hammerCharge?.cancel();
      }
      return;
    }
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
  clearHeld() { this.held?.clear(); this.heldKeys?.clear(); this.attackScene?.hammerCharge?.cancel(); this.attackScene = null; }
  onKey(event, down) {
    const code = canonicalCode(event);
    if (!down) this.pressedKeys?.delete(code);
    const target = event.target;
    if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || '') || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    const scene = this.activeScene(); if (!scene) return;
    if (scene.isIntro) {
      if (down && !event.repeat && !this.pressedKeys?.has(code)) scene.audio?.unlock?.(scene.elapsed);
      if (!GAME_KEYS.has(code)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (!down || event.repeat || this.pressedKeys?.has(code)) return;
      this.pressedKeys ||= new Set(); this.pressedKeys.add(code);
      if (code === 'Space') this.dispatch('attack', scene);
      else if (code === 'Enter') this.dispatch('confirm', scene);
      else if (code === 'KeyF') this.dispatch('fullscreen', scene);
      return;
    }
    const profile = this.getProfile(), action = actionForKey(event, profile);
    if (!action && !GAME_KEYS.has(code)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (down) {
      // Keep this latch across scene changes: the key that skips the intro or
      // opens a scene cannot also activate something in the next scene.
      // Some keyboard covers send repeated keydowns without event.repeat.
      if (event.repeat || this.pressedKeys?.has(code)) return;
      this.pressedKeys ||= new Set(); this.pressedKeys.add(code);
    }
    if (!action) {
      if (down && !event.repeat && profile === 'pc' && /^Digit[1-4]$/.test(code)) this.emitKey(scene, code);
      return;
    }
    if (HELD_ACTIONS.has(action)) {
      this.heldKeys ||= new Map();
      if (down) {
        if (!event.repeat) { this.heldKeys.set(code, action); this.setHeld(action, true); }
      } else {
        this.heldKeys.delete(code);
        // Releasing W must not release Up if the arrow is still held, or vice versa.
        if (![...this.heldKeys.values()].includes(action)) this.setHeld(action, false);
      }
    }
    else if (down && !event.repeat) this.dispatch(action);
  }
  pause(scene) {
    if (!scene?.player || scene.isPaused || scene.isGameOver || scene.levelCompleted || scene.isComplete) return;
    resetSceneKeys(scene); this.clearHeld(); this.pausedScene = scene; scene.scene.pause();
    if (this.overlay) { this.overlay.hidden = false; this.resumeButton.focus({ preventScroll: true }); }
  }
  resume() {
    const s = this.pausedScene; if (!s) return;
    resetSceneKeys(s); this.clearHeld(); s.scene.resume(); this.pausedScene = null;
    if (typeof s.worldTime === 'number') s.invulnerableUntil = Math.max(s.invulnerableUntil || 0, s.worldTime + 1000);
    s.player?.setData?.('invulnerableUntil', Math.max(s.player?.getData?.('invulnerableUntil') || 0, s.time.now + 1000));
    if (this.overlay) this.overlay.hidden = true; this.focus();
  }
  autoPause() {
    this.pressedKeys?.clear();
    const s = this.activeScene(); resetSceneKeys(s); this.clearHeld();
    if (s?.isIntro) { s.suspendIntro(); return; }
    if (!this.pausedScene) this.pause(s);
  }
  destroy() {
    document.removeEventListener('keydown', this.down, true); document.removeEventListener('keyup', this.up, true);
    window.removeEventListener('blur', this.blur); window.removeEventListener('focus', this.focusIn); document.removeEventListener('visibilitychange', this.visibility);
    this.canvas?.removeEventListener('pointerdown', this.focusPointer);
    this.overlay?.remove(); this.touchPad?.remove(); this.toolbar?.replaceChildren();
  }
}
