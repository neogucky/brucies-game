const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');
const root = path.join(__dirname, '..');
const context = { performance: { now: () => 100 }, Phaser: { Scene: class {} } };
vm.createContext(context);
function load(file, name) {
  let code = fs.readFileSync(path.join(root, file), 'utf8').replace(/^import[\s\S]*?;\n/gm, '');
  if (name) code = code.replace(/export default class \w+/, 'globalThis.' + name + ' = class ' + name);
  vm.runInContext(code.replace(/export /g, ''), context);
}
load('src/utils/jungleRules.js');
load('src/utils/inventory.js');
load('src/utils/BowManager.js', 'BowManager');
load('src/utils/controlProfiles.js');
load('src/utils/PortableControls.js', 'PortableControls');
load('src/scenes/shop/ShopSceneBase.js', 'ShopSceneBase');
load('src/scenes/jungle/JungleShopScene.js', 'JungleShopScene');
function sprite(x, y) {
  return { x, y, active: true,
    setDepth() { return this; }, setDisplaySize() { return this; }, setFlipX() { return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setRotation(r) { this.rotation = r; return this; }, destroy() { this.active = false; },
  };
}
function bowScene(mode = 'jump') {
  const keyboard = new EventEmitter();
  const scene = { gameMode: mode, facingX: 1, facing: { x: 1, y: 0 }, tileSize: 38,
    inventory: { passives: { bow: true } }, equipped: { weapon: 'sword', passive: 'bow' },
    player: { ...sprite(100, 200), body: { x: 85, y: 140, width: 30, height: 60 }, setFlipX() {} },
    input: { keyboard }, add: { image: sprite }, tweens: { add() {} },
    hud: { flashItem() {}, setPassiveCooldown() {} },
  };
  const bow = new context.BowManager(scene); scene.bow = bow; return { scene, bow, keyboard };
}
function advance(bow, frames = 60) { for (let i = 0; i < frames; i++) bow.update(.016); }
function enemy(x, y, hp = 3) {
  return { x, y, hp, active: true, getData() {}, getBounds: () => ({ x: x - 12, y: y - 24, width: 24, height: 48 }) };
}

test('a manual arrow has a shallow arc and stops at exactly ten 38px tiles', () => {
  const { bow } = bowScene(); assert.equal(bow.tryShoot(), true);
  const arrow = bow.arrows[0], startY = arrow.y;
  advance(bow, 18); assert.ok(arrow.y < startY - 5 && arrow.y > startY - 15);
  advance(bow);
  assert.ok(Math.abs(arrow.distance - 380) < .001);
  assert.equal(bow.arrows.length, 0); assert.equal(arrow.sprite.active, false);
});
test('arrow deals one damage once to a target and cannot pierce through it', () => {
  const { scene, bow } = bowScene(); const first = enemy(230, 170), second = enemy(300, 170);
  scene.monsters = { getChildren: () => [first, second] };
  scene.damageMonster = (m, amount) => { m.hp -= amount; };
  bow.tryShoot(); advance(bow);
  assert.equal(first.hp, 2); assert.equal(second.hp, 3);
});
test('targets beyond ten tiles cannot be damaged', () => {
  const { scene, bow } = bowScene(); const far = enemy(540, 170);
  scene.monsters = { getChildren: () => [far] }; scene.damageMonster = m => m.hp--;
  bow.tryShoot(); advance(bow); assert.equal(far.hp, 3);
});
test('arrows stop at an underground wall without breaking it or damaging the enemy behind', () => {
  const { scene, bow } = bowScene(); const m = enemy(280, 170);
  scene.blockMap = new Map([['5,4', { active: true }]]);
  scene.monsters = { getChildren: () => [m] }; scene.damageMonster = e => e.hp--;
  bow.tryShoot(); advance(bow); assert.equal(m.hp, 3);
  assert.equal(scene.blockMap.size, 1); assert.equal(bow.arrows.length, 0);
});
test('arrows fired in the desert follow facing direction in the isometric plane', () => {
  const { scene, bow } = bowScene('isometric'); scene.facing = { x: 0, y: -1 };
  const m = enemy(100, 55); scene.monsters = { getChildren: () => [m] }; scene.damageMonster = e => e.hp--;
  bow.tryShoot(); const a = bow.arrows[0]; advance(bow);
  assert.equal(a.vx, 0); assert.equal(m.hp, 2);
});
test('children auto-aim can hit an elevated jungle monkey', () => {
  const { scene, bow } = bowScene(); scene.autoAimEnabled = true;
  const m = enemy(340, 110); scene.monkeys = [m];
  scene.enemyBounds = e => e.getBounds(); scene.damageMonkey = e => e.hp--;
  bow.tryShoot(); advance(bow); assert.equal(m.hp, 2);
});
test('children auto-aim ignores a target behind an underground wall', () => {
  const { scene, bow } = bowScene(); scene.autoAimEnabled = true; scene.hasLineOfSight = () => false;
  const m = enemy(0, 170); scene.monsters = { getChildren: () => [m] }; scene.damageMonster = e => e.hp--;
  bow.tryShoot(); assert.ok(bow.arrows[0].vx > 0);
});
test('bow cooldown cannot be bypassed by reequipping or repeated Shift presses', () => {
  const { scene, bow, keyboard } = bowScene();
  keyboard.emit('keydown', { code: 'ShiftRight' }); assert.equal(bow.arrows.length, 1);
  scene.equipped.passive = 'shield'; scene.equipped.passive = 'bow';
  keyboard.emit('keydown', { key: 'Shift' }); assert.equal(bow.arrows.length, 1);
  advance(bow, 41); assert.equal(bow.tryShoot(), true);
});
for (const flag of ['isPaused', 'isGameOver', 'levelCompleted', 'isComplete', 'isEditorMode']) {
  test(flag + ' prevents firing', () => {
    const { scene, bow } = bowScene(); scene[flag] = true; assert.equal(bow.tryShoot(), false);
  });
}
test('shield and unequipped slots cannot fire; no arrows are spent or purchased separately', () => {
  const { scene, bow } = bowScene();
  scene.equipped.passive = 'shield'; assert.equal(bow.tryShoot(), false);
  scene.equipped.passive = null; assert.equal(bow.tryShoot(), false);
  scene.equipped.passive = 'bow'; scene.inventory.passives.bow = false; assert.equal(bow.tryShoot(), false);
});
test('pausing freezes arrows and cooldowns; shutdown removes visuals and Shift handlers', () => {
  const { scene, bow, keyboard } = bowScene(); bow.tryShoot(); const a = bow.arrows[0];
  scene.isPaused = true; advance(bow); assert.equal(a.distance, 0); assert.equal(bow.now, 0);
  bow.destroy(); assert.equal(a.sprite.active, false); assert.equal(keyboard.listenerCount('keydown'), 0);
});

function shop(coins, passive = 'shield') {
  const s = Object.create(context.ShopSceneBase.prototype);
  Object.assign(s, { coins, honeyCount: 0, inventory: { passives: {}, weapons: {}, consumables: {} },
    equipped: { weapon: 'sword', passive },
    updateHudAfterPurchase() {}, saves: 0, saveInventory() { this.saves++; },
    showPurchaseMessage(text) { this.message = text; },
  });
  return s;
}
const bowItem = context.JungleShopScene.prototype.getShopConfig().items.find(item => item.id === 'bow');
test('jungle shop charges exactly 300 gold, preserves the shield selection, and forbids duplicate purchases', () => {
  const s = shop(450); s.buyItem(bowItem);
  assert.equal(s.coins, 150); assert.equal(s.inventory.passives.bow, true); assert.equal(s.equipped.passive, 'shield');
  s.buyItem(bowItem); assert.equal(s.coins, 150); assert.equal(s.saves, 1);
});
test('shop refuses purchase below 300 gold and equips a new bow only if the secondary slot is empty', () => {
  const poor = shop(299); poor.buyItem(bowItem);
  assert.equal(poor.coins, 299); assert.equal(poor.inventory.passives.bow, undefined);
  const s = shop(300, null); s.buyItem(bowItem); assert.equal(s.equipped.passive, 'bow'); assert.equal(s.coins, 0);
});
test('bow ownership and selection survive save normalization without enabling shield or shoes', () => {
  const save = context.applyInventoryToSave({}, { passives: { bow: true }, weapons: { sword: true }, consumables: {} },
    { weapon: 'sword', passive: 'bow', companion: null });
  const result = context.normalizeInventory(save);
  assert.equal(result.inventory.passives.bow, true); assert.equal(result.equipped.passive, 'bow');
  assert.equal(save.equipment.shield, false); assert.equal(save.equipment.shoes, false);
});

for (const [event, profile, action] of [
  [{ key: 'Return', keyCode: 0 }, 'pc', 'confirm'], [{ code: 'NumpadEnter' }, 'pc', 'confirm'],
  [{ key: 'Return', keyCode: 0 }, 'ipadKeyboard', 'confirm'], [{ code: 'NumpadEnter' }, 'ipadKeyboard', 'confirm'],
  [{ code: 'Unidentified', key: 'UIKeyInputReturn', keyCode: 0 }, 'ipadKeyboard', 'confirm'],
  [{ key: 'UIKeyInputEscape' }, 'pc', 'back'], [{ code: 'KeyQ' }, 'ipadKeyboard', 'back'],
  [{ code: 'KeyI' }, 'ipadKeyboard', 'inventory'], [{ code: 'Tab' }, 'pc', 'inventory'],
  [{ key: 'Shift' }, 'ipadKeyboard', 'shoot'], [{ code: 'ShiftRight' }, 'pc', 'shoot'],
  [{ code: 'KeyP' }, 'pc', 'pause'], [{ code: 'ArrowUp' }, 'ipadKeyboard', 'up'],
]) test(JSON.stringify(event) + ' maps to ' + profile + ' action ' + action, () => assert.equal(context.actionForKey(event, profile), action));
test('legacy aliases, shortcuts and composing text do not activate the default iPad profile', () => {
  for (const event of [{ code: 'Enter', ctrlKey: true }, { code: 'KeyQ', metaKey: true }, { key: 'Enter', isComposing: true },
    { code: 'KeyE' }, { code: 'Escape' }, { code: 'Tab' }, { code: 'Backspace' }, { metaKey: true, key: '.' }])
    assert.equal(context.actionForKey(event), null);
});
function controls(scene) {
  const c = Object.create(context.PortableControls.prototype);
  c.activeScene = () => scene; c.focus = () => {}; return c;
}
test('confirm in inventory equips once without starting a level; back closes without exiting the game', () => {
  let equipped = 0, closed = 0, exits = 0;
  const scene = { input: { keyboard: new EventEmitter() }, inventoryOverlay: {
    isOpen: true, applySelection() { equipped++; }, close() {}, onClose() { closed++; },
  } };
  scene.input.keyboard.on('keydown-ENTER', () => exits++); scene.input.keyboard.on('keydown-ESC', () => exits++);
  const c = controls(scene); c.dispatch('confirm'); c.dispatch('back');
  assert.equal(equipped, 1); assert.equal(closed, 1); assert.equal(exits, 0);
});
test('toolbar confirmation and cancel use the explicit dialog actions once', () => {
  let yes = 0, no = 0; const scene = { confirmation: { isOpen: true, choose(answer) { if(answer) yes++; else no++; } } };
  const c = controls(scene); c.dispatch('yes'); c.dispatch('no'); assert.equal(yes, 1); assert.equal(no, 1);
});
test('the lever animation blocks attacks, menus and movement without opening another dialog', () => {
  let actions = 0;
  const scene = { isInteractingWithLever: true, input: { keyboard: new EventEmitter() },
    toggleInventory() { actions++; }, bow: { tryShoot() { actions++; } },
    cursors: { right: { onDown() { actions++; } } }, hammerCharge: { press() { actions++; } } };
  scene.input.keyboard.on('keydown', () => actions++);
  const c = controls(scene); c.pause = () => actions++;
  for (const action of ['confirm', 'back', 'inventory', 'attack', 'shoot', 'pause']) c.dispatch(action);
  c.setHeld('right', true); c.setHeld('attack', true);
  assert.equal(actions, 0);
});
test('confirm advances a dialog page or selects the current shop option without needing Enter', () => {
  let next = 0, selected = 0;
  const scene = { dialog: { container: { visible: true }, pages: [{}], index: 0,
    nextPage() { next++; }, selectOption() { selected++; } } };
  const c = controls(scene); c.dispatch('confirm'); scene.dialog.pages[0] = { options: [{}] }; c.dispatch('confirm');
  assert.equal(next, 1); assert.equal(selected, 1);
});
test('both broken and native iPad arrow events use the same held-key adapter as WASD', () => {
  let downs = 0, ups = 0, prevented = 0;
  const key = { onDown() { downs++; }, onUp() { ups++; } };
  const c = controls({ cursors: { up: key }, input: { keyboard: new EventEmitter() } }); c.held = new Set();
  const event = { key: 'ArrowUp', keyCode: 0, preventDefault() { prevented++; }, stopImmediatePropagation() {} };
  c.onKey(event, true); c.onKey(event, false);
  assert.equal(downs, 1); assert.equal(ups, 1); assert.equal(prevented, 2);
  c.onKey({ ...event, keyCode: 38 }, true); c.onKey({ ...event, keyCode: 38 }, false); assert.equal(downs, 2);
  c.onKey({ ...event, key: 'w' }, true); c.onKey({ ...event, key: 'w' }, false); assert.equal(downs, 3); assert.equal(ups, 3);
});
test('app switching clears stuck movement keys and pause/resume grants a short grace period', () => {
  let resets = 0, paused = 0, resumed = 0;
  const scene = { time: { now: 3000 }, worldTime: 1000, input: { keyboard: { keys: [{ reset() { resets++; } }] } },
    player: { body: { setVelocity() {} }, setData() {} }, scene: { pause() { paused++; }, resume() { resumed++; } } };
  const c = controls(scene); c.autoPause(); assert.equal(c.pausedScene, scene); c.resume();
  assert.equal(paused, 1); assert.equal(resumed, 1); assert.ok(resets >= 2); assert.equal(scene.invulnerableUntil, 2000);
});
