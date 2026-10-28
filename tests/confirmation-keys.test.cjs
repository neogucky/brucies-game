const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');

const context = { performance: { now: () => 100 } };
vm.createContext(context);
for (const [file, name] of [
  ['utils/controlProfiles.js'], ['utils/PortableControls.js', 'PortableControls'],
  ['utils/ControlLabels.js', 'ControlLabels'], ['ui/ConfirmationDialog.js'],
]) {
  let code = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8').replace(/^import .*;\n/gm, '');
  if (name) code = code.replace('export default class ' + name, 'globalThis.' + name + ' = class ' + name);
  vm.runInContext(code.replace(/export /g, ''), context);
}

function setup(profile = 'ipadKeyboard', key = 'MainMenuScene') {
  const objects = [], destinations = [];
  const scene = {
    sys: { settings: { key } }, input: { keyboard: new EventEmitter() }, events: new EventEmitter(),
    time: { paused: false }, physics: { world: { pause() {}, resume() {} } },
    scene: { start(destination) { destinations.push(destination); } },
    children: { list: objects },
  };
  const object = () => {
    const o = { scene, active: true, list: [], text: '', handlers: {},
      setDepth() { return this; }, setScrollFactor() { return this; }, setStrokeStyle() { return this; },
      setOrigin() { return this; }, setInteractive() { return this; }, setText(value) { this.text = value; return this; },
      add(children) { this.list.push(...(Array.isArray(children) ? children : [children])); return this; },
      on(event, handler) { this.handlers[event] = handler; return this; },
      destroy() { this.active = false; this.list.forEach(child => child.destroy()); },
    };
    objects.push(o); return o;
  };
  scene.add = { container: object, rectangle: object, text(x, y, text) { return Object.assign(object(), { text }); } };
  const controls = Object.create(context.PortableControls.prototype);
  Object.assign(controls, { activeScene: () => scene, getProfile: () => profile,
    pressedKeys: new Set(), held: new Set(), heldKeys: new Map() });
  const press = code => {
    const event = { code, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
    controls.onKey(event, true); controls.onKey(event, false); return event;
  };
  return { scene, controls, press, objects, destinations };
}

for (const profile of ['ipadKeyboard', 'pc']) {
  test(profile + ': J means yes, N means no; Enter, Q, E, Escape and Space cannot answer', () => {
    const { scene, controls, press } = setup(profile); let accepted = 0;
    context.showConfirmation(scene, 'Wirklich?', () => accepted++);
    for (const code of ['Enter', 'KeyQ', 'KeyE', 'Escape', 'Space', 'Backspace']) {
      press(code); assert.equal(scene.confirmation?.isOpen, true, code + ' must not answer');
    }
    press('KeyN'); assert.equal(scene.confirmation, null); assert.equal(accepted, 0);
    context.showConfirmation(scene, 'Wirklich?', () => accepted++);
    press('KeyJ'); assert.equal(scene.confirmation, null); assert.equal(accepted, 1);
    controls.onKey({ code: 'KeyJ', repeat: true, preventDefault() {}, stopImmediatePropagation() {} }, true);
    assert.equal(accepted, 1);
  });

  test(profile + ': visible labels show the exact J/N bindings', () => {
    const { scene, objects } = setup(profile);
    context.showConfirmation(scene, 'Wirklich?', () => {});
    const formatter = new context.ControlLabels(scene); formatter.update(profile);
    assert.ok(objects.some(o => o.text === 'Ja · J'));
    assert.ok(objects.some(o => o.text === 'Nein · N'));
    assert.ok(!objects.some(o => /(?:Ja|Nein) · (?:Enter|Q|Esc|E)$/.test(o.text)));
    formatter.destroy();
  });
}

for (const [key, destination] of [
  ['DesertRuinScene', 'DessertMapScene'], ['DesertEndlessScene', 'DessertMapScene'],
  ['DesertTunnelScene', 'DessertMapScene'], ['UndergroundDigScene', 'UndergroundMapScene'],
  ['JungleScene', 'JungleMapScene'], ['CoinChallengeScene', 'UndergroundMapScene'],
]) {
  test(key + ': N continues playing, J exits exactly once', () => {
    const { scene, press, destinations } = setup('ipadKeyboard', key);
    context.showExitConfirmation(scene, destination);
    press('KeyN'); assert.deepEqual(destinations, []); assert.equal(scene.isPaused, false);
    context.showExitConfirmation(scene, destination);
    press('Enter'); assert.deepEqual(destinations, []);
    press('KeyJ'); assert.deepEqual(destinations, [destination]);
  });
}

test('yes and no buttons work by click without a keyboard', () => {
  const { scene, objects } = setup('ipadTouch'); let accepted = 0;
  context.showConfirmation(scene, 'Wirklich?', () => accepted++);
  const formatter = new context.ControlLabels(scene); formatter.update('ipadTouch');
  objects.find(o => o.text === 'Nein').handlers.pointerdown();
  assert.equal(accepted, 0); assert.equal(scene.confirmation, null);
  context.showConfirmation(scene, 'Wirklich?', () => accepted++); formatter.update('ipadTouch');
  objects.find(o => o.text === 'Ja' && o.active).handlers.pointerdown();
  assert.equal(accepted, 1); formatter.destroy();
});

test('Enter still activates ordinary menus and places after a J/N dialog closes', () => {
  const { scene, press } = setup(); let confirmed = 0;
  scene.input.keyboard.on('keydown-ENTER', () => confirmed++);
  press('Enter'); assert.equal(confirmed, 1);
  context.showConfirmation(scene, 'Wirklich?', () => {});
  press('Enter'); assert.equal(confirmed, 1);
  press('KeyN'); press('Enter'); assert.equal(confirmed, 2);
});

test('iPad key-only events recognize both lowercase and uppercase J/N', () => {
  const { scene, controls } = setup(); let accepted = 0;
  for (const [key, yes] of [['n', false], ['N', false], ['j', true], ['J', true]]) {
    context.showConfirmation(scene, 'Wirklich?', () => accepted++);
    const event = { code: 'Unidentified', key, preventDefault() {}, stopImmediatePropagation() {} };
    controls.onKey(event, true); controls.onKey(event, false);
    assert.equal(scene.confirmation, null);
    assert.equal(accepted, yes ? key === 'J' ? 2 : 1 : 0);
  }
});
