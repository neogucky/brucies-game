const KEY_CODES = { Enter: 13, Escape: 27, Tab: 9, Space: 32,
  ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40,
  KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, ShiftLeft: 16, ShiftRight: 16 };
const KEY_NAMES = { Enter: "ENTER", Escape: "ESC", Tab: "TAB", Space: "SPACE",
  ArrowLeft: "LEFT", ArrowUp: "UP", ArrowRight: "RIGHT", ArrowDown: "DOWN",
  KeyW: "W", KeyA: "A", KeyS: "S", KeyD: "D", ShiftLeft: "SHIFT", ShiftRight: "SHIFT" };

export function canonicalCode(event) {
  if (event.code && event.code !== "Unidentified") return event.code === "Return" ? "Enter" : event.code === "Esc" ? "Escape" : event.code;
  const special = { Return: "Enter", Enter: "Enter", Escape: "Escape", Esc: "Escape",
    UIKeyInputEscape: "Escape", UIKeyInputReturn: "Enter", "\r": "Enter", "\n": "Enter", Tab: "Tab", " ": "Space", Spacebar: "Space",
    Up: "ArrowUp", Down: "ArrowDown", Left: "ArrowLeft", Right: "ArrowRight",
    UIKeyInputUpArrow: "ArrowUp", UIKeyInputDownArrow: "ArrowDown",
    UIKeyInputLeftArrow: "ArrowLeft", UIKeyInputRightArrow: "ArrowRight",
    Shift: "ShiftLeft", Backspace: "Backspace" };
  if (special[event.key]) return special[event.key];
  if (/^[a-z]$/i.test(event.key || "")) return "Key" + event.key.toUpperCase();
  return event.key || "";
}
export function actionForKey(event) {
  if (event.isComposing) return null;
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return event.metaKey && event.key === "." ? "back" : null;
  }
  const code = canonicalCode(event);
  if (["Enter", "NumpadEnter", "KeyE"].includes(code)) return "confirm";
  if (["Escape", "Backspace", "KeyQ"].includes(code)) return "back";
  if (["Tab", "KeyI"].includes(code)) return "inventory";
  if (code === "KeyP") return "pause";
  if (["ShiftLeft", "ShiftRight"].includes(code)) return "shoot";
  return null;
}

export function resetSceneKeys(scene) {
  const keyboard = scene?.input?.keyboard;
  const keys = new Set([...(keyboard?.keys || []), ...Object.values(scene?.cursors || {}), ...Object.values(scene?.wasd || {})]);
  keys.forEach(key => key?.reset?.());
  scene?.player?.body?.setVelocity?.(0, 0);
}

export default class PortableControls {
  constructor(game) {
    this.game = game; this.pausedScene = null; this.buttons = {};
    this.toolbar = document.getElementById("game-controls");
    this.canvas = game.canvas;
    this.buildToolbar();
    this.down = event => this.onKey(event, true);
    this.up = event => this.onKey(event, false);
    this.blur = () => this.autoPause();
    this.visibility = () => { if (document.hidden) this.autoPause(); };
    document.addEventListener("keydown", this.down, true);
    document.addEventListener("keyup", this.up, true);
    window.addEventListener("blur", this.blur);
    document.addEventListener("visibilitychange", this.visibility);
    this.focusPointer = () => this.focus();
    this.canvas?.addEventListener("pointerdown", this.focusPointer);
    if (this.canvas) {
      this.canvas.tabIndex = 0;
      this.canvas.setAttribute("aria-label", "Brucies Spiel. E bestätigt, Q zurück, I Inventar, Shift Bogen, P Pause.");
    }
  }
  activeScene() {
    const scenes = this.game.scene.getScenes(true).filter(s => s.sys.settings.key !== "BootScene");
    return this.pausedScene || scenes[scenes.length - 1];
  }
  focus() { this.canvas?.focus({ preventScroll: true }); }
  buildToolbar() {
    if (!this.toolbar) return;
    const labels = { confirm: "Bestätigen · E ↵", back: "Zurück · Q", inventory: "Inventar · I",
      shoot: "Schießen · Shift", pause: "Pause · P" };
    Object.entries(labels).forEach(([action, label]) => {
      const button = document.createElement("button");
      button.type = "button"; button.textContent = label; button.dataset.action = action;
      button.addEventListener("click", () => { this.dispatch(action); this.focus(); });
      this.toolbar.appendChild(button); this.buttons[action] = button;
    });
    this.overlay = document.createElement("div"); this.overlay.id = "game-pause"; this.overlay.hidden = true;
    this.overlay.setAttribute("role", "dialog"); this.overlay.setAttribute("aria-label", "Spiel pausiert");
    const title = document.createElement("h2"); title.textContent = "Pause";
    const resume = document.createElement("button"); resume.type = "button";
    resume.textContent = "Weiterspielen · E / P";
    resume.addEventListener("click", () => { this.resume(); this.focus(); });
    this.overlay.append(title, resume); document.getElementById("play-shell")?.appendChild(this.overlay);
    this.resumeButton = resume;
  }
  update() {
    if (!this.canvas && this.game.canvas) {
      this.canvas = this.game.canvas; this.canvas.tabIndex = 0;
      this.canvas.addEventListener("pointerdown", this.focusPointer);
    }
    const scene = this.activeScene(); if (!scene) return;
    if (scene !== this.lastScene) { resetSceneKeys(this.lastScene); this.lastScene = scene; }
    if (!this.toolbar) return;
    const disabled = (button, value) => { if (button.disabled !== Boolean(value)) button.disabled = Boolean(value); };
    disabled(this.buttons.inventory, Boolean(this.pausedScene) || typeof scene.toggleInventory !== "function" || scene.isGameOver || scene.levelCompleted || scene.isComplete);
    disabled(this.buttons.shoot, Boolean(this.pausedScene) || !scene.bow?.equipped() || scene.bow.isBlocked());
    disabled(this.buttons.pause, !this.pausedScene && (!scene.player || scene.isPaused || scene.isGameOver || scene.levelCompleted || scene.isComplete));
    const pauseLabel = this.pausedScene ? "Weiter · P" : "Pause · P";
    if (this.buttons.pause.textContent !== pauseLabel) this.buttons.pause.textContent = pauseLabel;
    const asking = scene.promptBox?.visible || scene.confirmBox?.visible;
    const confirmLabel = asking ? "Ja · E" : "Bestätigen · E ↵", backLabel = asking ? "Nein · Q" : "Zurück · Q";
    if (this.buttons.confirm.textContent !== confirmLabel) this.buttons.confirm.textContent = confirmLabel;
    if (this.buttons.back.textContent !== backLabel) this.buttons.back.textContent = backLabel;
  }
  emitKey(scene, code) {
    const keyboard = scene?.input?.keyboard; if (!keyboard) return;
    const event = { code, key: code, keyCode: KEY_CODES[code] || 0, which: KEY_CODES[code] || 0,
      repeat: false, timeStamp: performance.now(), preventDefault() {}, stopPropagation() {} };
    keyboard.emit("keydown", event);
    keyboard.emit("keydown-" + (KEY_NAMES[code] || code.replace("Key", "")), event);
  }
  dispatch(action) {
    if (this.pausedScene) {
      if (["confirm", "back", "pause"].includes(action)) this.resume();
      return;
    }
    const s = this.activeScene(); if (!s) return;
    if (action === "pause") { this.pause(s); return; }
    if (s.inventoryOverlay?.isOpen) {
      if (action === "confirm") s.inventoryOverlay.applySelection();
      if (action === "back" || action === "inventory") { s.inventoryOverlay.close(); s.inventoryOverlay.onClose?.(); }
      return;
    }
    if (action === "inventory") { s.toggleInventory?.(); return; }
    if (action === "shoot") { if (!s.dialog?.container?.visible) s.bow?.tryShoot(); return; }
    if (s.promptBox?.visible || s.confirmBox?.visible) {
      this.emitKey(s, action === "confirm" ? "KeyJ" : "KeyN"); return;
    }
    if (s.dialog?.container?.visible) {
      if (action === "back") { s.dialog.hide(); return; }
      const page = s.dialog.pages[s.dialog.index];
      if (page?.options?.length) s.dialog.selectOption(page.options);
      else s.dialog.nextPage();
      return;
    }
    this.emitKey(s, action === "confirm" ? "Enter" : "Escape");
  }
  onKey(event, down) {
    const target = event.target;
    if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || "")) return;
    const scene = this.activeScene(); if (!scene) return;
    const action = actionForKey(event);
    if (action) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (down && !event.repeat) this.dispatch(action);
      return;
    }
    if (this.pausedScene) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    const code = canonicalCode(event);
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD", "Space"].includes(code)) return;
    // Some iPad keyboard events have a useful key/code but no legacy keyCode.
    if (event.keyCode && event.keyCode !== 229) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const key = ({ ArrowUp: scene.cursors?.up, ArrowDown: scene.cursors?.down,
      ArrowLeft: scene.cursors?.left, ArrowRight: scene.cursors?.right, Space: scene.cursors?.space })[code]
      || scene.wasd?.[code.replace("Key", "")];
    const normalized = { keyCode: KEY_CODES[code], timeStamp: performance.now(),
      altKey: false, ctrlKey: false, metaKey: false, shiftKey: event.shiftKey, repeat: event.repeat };
    if (down) { key?.onDown?.(normalized); if (!event.repeat) this.emitKey(scene, code); }
    else key?.onUp?.(normalized);
  }
  pause(scene) {
    if (!scene?.player || scene.isPaused || scene.isGameOver || scene.levelCompleted || scene.isComplete) return;
    resetSceneKeys(scene); this.pausedScene = scene; scene.scene.pause();
    if (this.overlay) { this.overlay.hidden = false; this.resumeButton.focus({ preventScroll: true }); }
  }
  resume() {
    const s = this.pausedScene; if (!s) return;
    resetSceneKeys(s); s.scene.resume(); this.pausedScene = null;
    // A short grace period makes returning from another iPad app safe.
    if (typeof s.worldTime === "number") s.invulnerableUntil = Math.max(s.invulnerableUntil || 0, s.worldTime + 1000);
    s.player?.setData?.("invulnerableUntil", Math.max(s.player?.getData?.("invulnerableUntil") || 0, s.time.now + 1000));
    if (this.overlay) this.overlay.hidden = true;
    this.focus();
  }
  autoPause() {
    const s = this.activeScene(); resetSceneKeys(s);
    if (!this.pausedScene) this.pause(s);
  }
  destroy() {
    document.removeEventListener("keydown", this.down, true); document.removeEventListener("keyup", this.up, true);
    window.removeEventListener("blur", this.blur); document.removeEventListener("visibilitychange", this.visibility);
    this.canvas?.removeEventListener("pointerdown", this.focusPointer);
    this.overlay?.remove(); this.toolbar?.replaceChildren();
  }
}
