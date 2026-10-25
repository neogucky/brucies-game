const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { EventEmitter } = require('node:events');
const ctx = vm.createContext({ Phaser: { Scene: class {} } });
function load(file, name) {
  let code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/^import .*;\n/gm, '');
  if (name) code = code.replace(/export default class \w+/, `globalThis.${name} = class ${name}`);
  vm.runInContext(code.replace(/export /g, ''), ctx);
}
load('src/ui/emphasizedText.js'); load('src/utils/expertKnowledge.js');
load('src/dialogManager.js', 'DialogManager'); load('src/scenes/shop/ShopSceneBase.js', 'ShopSceneBase');
load('src/scenes/ExpertScene.js', 'ExpertScene'); load('src/utils/PortableControls.js', 'PortableControls');
const experts = vm.runInContext('EXPERT_WORLDS', ctx);

function art(x = 0, y = 0, text = '', style = {}) {
  return { x, y, text, style: { ...style }, width: 0, height: 20, visible: true, list: [], originX: 0,
    texture: { getSourceImage: () => ({ width: 200, height: 200 }) },
    setDepth() { return this; }, setScrollFactor() { return this; }, setStrokeStyle() { return this; },
    setStroke() { return this; }, setScale(value) { this.scale = value; return this; }, setDisplaySize() { return this; }, setMask() { return this; },
    setInteractive() { return this; }, on() { return this; }, createGeometryMask() { return {}; },
    setSize(w, h) { this.width = w; this.height = h; return this; },
    setVisible(v) { this.visible = v; return this; }, setTexture() { return this; }, setX(x) { this.x = x; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setOrigin(x, y = x) { this.originX = x; this.originY = y; return this; },
    setStyle(next) { Object.assign(this.style, next); return this.setText(this.text); },
    setText(value) { this.text = value; this.width = value.length * (this.style.fontStyle === 'bold' ? 10 : 8); return this; },
    add(items) { this.list.push(...(Array.isArray(items) ? items : [items])); return this; },
    removeAll() { this.list = []; return this; }, destroy() { this.destroyed = true; },
  };
}
function fixture(world, visited = false) {
  const s = new ctx.ExpertScene(); s.init({ world }); s.expert = experts[world]; s.categoryIndex = 0; s.topicIndex = 0;
  s.getSaveData = () => ({ visitedExperts: { [world]: visited } });
  s.add = { container: art, rectangle: art, image(x, y) { return Object.assign(art(x, y), { width: 1586, height: 992 }); }, circle: art, text: art };
  s.shopConfig = s.getShopConfig(); s.addBackground();
  s.input = { keyboard: new EventEmitter() }; s.textures = { exists: () => true };
  s.scene = { start() {} }; s.dialog = new ctx.DialogManager(s);
  const controls = Object.create(ctx.PortableControls.prototype); controls.activeScene = () => s;
  s.showLoadingScreen(); return { s, controls };
}

for (const world of Object.keys(experts)) for (const visited of [false, true]) {
  test(`${world}, ${visited ? 'return' : 'first'} visit: the whole board waits for both dialog pages`, () => {
    const { s, controls } = fixture(world, visited);
    assert.equal(s.knowledgeBoard.visible, false); assert.equal(s.canBrowseKnowledge(), false);
    assert.ok(960 / s.studyBackdrop.scale < s.studyBackdrop.width / 2, 'the painted board is outside the welcome shot');
    assert.equal(s.dialog.text.text, visited ? experts[world].returnGreeting : experts[world].greeting);
    s.input.keyboard.emit('keydown-RIGHT'); assert.equal(s.categoryIndex, 0);
    controls.dispatch('confirm');
    assert.equal(s.dialog.text.text, experts[world].boardIntro); assert.equal(s.knowledgeBoard.visible, false);
    controls.dispatch('confirm');
    assert.equal(s.dialog.container.visible, false); assert.equal(s.knowledgeBoard.visible, true);
    assert.equal(s.studyBackdrop.scale, s.studyScale); assert.equal(s.studyBackdrop.x, 480);
    assert.equal(s.topicIndex, 0); assert.equal(s.canBrowseKnowledge(), true);
    s.input.keyboard.emit('keydown-RIGHT'); assert.equal(s.categoryIndex, 1);
  });
}

test('dialog body and hint reserve space for the portrait and reset for text-only reuse', () => {
  const { s } = fixture('jungle');
  for (const position of ['top', 'middle', 'bottom']) {
    s.dialog.show([{ text: experts.jungle.greeting }], position, { portraitKey: 'professor-portrait' });
    const portraitRight = s.dialog.portraitFrame.x + 78;
    assert.ok(s.dialog.text.x - portraitRight >= 30);
    assert.equal(s.dialog.text.originX, 0); assert.equal(s.dialog.text.style.align, 'left');
    assert.ok(s.dialog.text.x + s.dialog.text.style.wordWrap.width <= 832);
    assert.ok(s.dialog.hint.x > portraitRight);
  }
  s.dialog.show([{ text: 'Ein Gespräch ohne Porträt.' }]);
  assert.equal(s.dialog.text.x, 480); assert.equal(s.dialog.text.originX, .5);
  assert.equal(s.dialog.text.style.wordWrap.width, 700); assert.equal(s.dialog.text.style.align, 'center');
});

test('bold words wrap using their own measured width, with no visible markup or leading spaces', () => {
  const measure = (text, bold) => text.length * (bold ? 12 : 8);
  const { runs } = ctx.layoutEmphasizedText('Kokos macht **leichten Schaden**.\nIm Saft **klebst du fest**.', 170, measure);
  assert.ok(runs.some(run => run.bold && run.text.includes('Schaden')));
  assert.ok(runs.some(run => run.bold && run.text.includes('klebst')));
  for (const run of runs) {
    assert.ok(run.x >= 0 && run.x + measure(run.text, run.bold) <= 170);
    assert.ok(!run.text.includes('**')); assert.ok(!run.text.startsWith(' '));
  }
});

test('expert tips explain useful effects with emphasis instead of damage and time statistics', () => {
  for (const expert of Object.values(experts)) for (const topics of Object.values(expert.topics)) for (const [, text] of topics) {
    assert.ok(text.includes('**')); assert.equal(text.split('**').length % 2, 1);
    assert.ok(!/\d|Sekunden|Millisekunden|Prozent|Lebenspunkte/.test(text), text);
  }
  assert.ok(/Urwald/.test(experts.jungle.greeting)); assert.ok(/Urwald/.test(experts.jungle.returnGreeting));
  assert.ok(experts.jungle.topics.Gegner[0][1].includes('**leichten Schaden**'));
  assert.ok(experts.jungle.topics.Gegner[0][1].includes('**klebst du fest**'));
});

test('mixed-weight text uses whole-run measurements without accumulating rounding gaps', () => {
  const measure = text => Math.ceil(text.length * 3.3);
  const { runs } = ctx.layoutEmphasizedText('Viele kleine Worte vor **einem Hinweis** und danach.', 330, measure);
  assert.equal(runs[1].x, measure(runs[0].text) + measure(' '));
  assert.equal(runs[2].x, runs[1].x + measure(runs[1].text) + measure(' '));
});
