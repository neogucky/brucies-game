// Hardware keyboards cannot be detected reliably on iPad. Start with its safe
// keyboard layout and let the player choose explicitly; never infer a keyboard.
export const DEFAULT_CONTROL_PROFILE = 'ipadKeyboard';
const common = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown',
  attack: 'Space', shoot: 'ShiftLeft', pause: 'KeyP', potion1: 'KeyT', potion2: 'KeyG', fullscreen: 'KeyF',
  yes: 'KeyJ', no: 'KeyN' };
export const CONTROL_PROFILES = {
  ipadTouch: { name: 'iPad ohne Tastatur', keys: {} },
  ipadKeyboard: { name: 'iPad mit Tastatur', keys: { ...common, confirm: 'Enter', back: 'KeyQ', inventory: 'KeyI' } },
  pc: { name: 'PC', keys: { ...common, confirm: 'Enter', back: 'Escape', inventory: 'Tab' } },
};
export function controlProfileId(value) { return Object.hasOwn(CONTROL_PROFILES, value) ? value : DEFAULT_CONTROL_PROFILE; }
export function profileForScene(scene) {
  return controlProfileId(scene?.game?.portableControls?.getProfile?.() || scene?.registry?.get?.('saveData')?.settings?.controlProfile);
}
export function canonicalCode(event) {
  let code = event.code && event.code !== 'Unidentified' ? event.code : '';
  if (!code) {
    const special = { Return: 'Enter', Enter: 'Enter', Escape: 'Escape', Esc: 'Escape', UIKeyInputEscape: 'Escape',
      UIKeyInputReturn: 'Enter', '\r': 'Enter', '\n': 'Enter', Tab: 'Tab', ' ': 'Space', Spacebar: 'Space',
      Up: 'ArrowUp', Down: 'ArrowDown', Left: 'ArrowLeft', Right: 'ArrowRight', UIKeyInputUpArrow: 'ArrowUp',
      UIKeyInputDownArrow: 'ArrowDown', UIKeyInputLeftArrow: 'ArrowLeft', UIKeyInputRightArrow: 'ArrowRight', Shift: 'ShiftLeft', Backspace: 'Backspace' };
    code = special[event.key] || (/^[a-z]$/i.test(event.key || '') ? 'Key' + event.key.toUpperCase() :
      /^[0-9]$/.test(event.key || '') ? 'Digit' + event.key : event.key || '');
  }
  return ({ Return: 'Enter', NumpadEnter: 'Enter', Esc: 'Escape', ShiftRight: 'ShiftLeft' })[code] || code;
}
export function actionForKey(event, profile = DEFAULT_CONTROL_PROFILE) {
  if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return null;
  const id = controlProfileId(profile), code = canonicalCode(event), keys = CONTROL_PROFILES[id].keys;
  // Both movement layouts are always available on a keyboard. Confirmation
  // and menu actions still have exactly the one key shown by the active profile.
  if (id !== 'ipadTouch') {
    const movement = { KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right' };
    if (movement[code]) return movement[code];
  }
  return Object.keys(keys).find(action => keys[action] === code) || null;
}
export function keyLabel(profile, action) {
  const code = CONTROL_PROFILES[controlProfileId(profile)].keys[action];
  if (!code) return '';
  return ({ Space: 'Leertaste', Enter: 'Enter', Escape: 'Esc', Tab: 'Tab', ShiftLeft: 'Shift', ArrowLeft: '←',
    ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' })[code] || code.replace('Key', '');
}
export function actionLabel(profile, action, title) {
  const key = keyLabel(profile, action); return title + (key ? ' · ' + key : '');
}
export function formatControlHint(template, profile = DEFAULT_CONTROL_PROFILE) {
  const touch = profile === 'ipadTouch';
  let text = String(template);
  if (touch) text = text.replace(/\s*·\s*\{(?:confirm|back|yes|no|inventory|attack|shoot|pause|potion1|potion2)\}(?!\s*[:=+])/g, '')
    .replace(/\{(?:confirm|back|yes|no|inventory|attack|shoot|pause|potion1|potion2)\}\s*·\s*/g, '');
  return text.replace(/\{(\w+)\}/g, (_match, action) => {
    if (action === 'move') return touch ? 'Richtungsknöpfe' : 'WASD / Pfeile';
    if (action === 'jump') return touch ? 'Springen' : '↑';
    if (action === 'climb') return touch ? '↑/↓' : '↑/↓';
    if (action === 'drop') return '↓↓';
    if (touch) return ({ confirm: 'Antippen', back: 'Zurück', yes: 'Antippen', no: 'Antippen', inventory: 'Inventar', attack: 'Angriff', shoot: 'Bogen', pause: 'Pause', potion1: 'Trank 1', potion2: 'Trank 2' })[action] || '';
    return keyLabel(profile, action);
  });
}
