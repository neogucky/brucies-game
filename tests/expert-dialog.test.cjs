const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { EventEmitter } = require('node:events');
const ctx = vm.createContext({ performance: {now:()=>100}, Phaser: { Scene: class {} }, saveProgress() {} });
function load(file, name) {
  let code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/^import .*;\n/gm, '');
  if (name) code = code.replace(/export default class \w+/, `globalThis.${name} = class ${name}`);
  vm.runInContext(code.replace(/export /g, ''), ctx);
}
load('src/utils/controlProfiles.js'); load('src/ui/emphasizedText.js'); load('src/utils/expertKnowledge.js'); load('src/utils/expertDiscovery.js');
load('src/utils/mapDiscovery.js');
load('src/dialogManager.js', 'DialogManager'); load('src/scenes/shop/ShopSceneBase.js', 'ShopSceneBase');
load('src/scenes/ExpertScene.js', 'ExpertScene'); load('src/utils/PortableControls.js', 'PortableControls');
const {experts,cards} = vm.runInContext('({experts:EXPERT_WORLDS,cards:EXPERT_CARDS})', ctx);

function art(x = 0, y = 0, text = '', style = {}) {
  return { x, y, text, style: { ...style }, width: 0, height: 20, visible: true, list: [], originX: 0,
    texture: { getSourceImage: () => ({ width: 200, height: 200 }) },
    setTint(tint) { this.tint=tint; return this; }, setAlpha(alpha) {this.alpha=alpha;return this;}, setDepth() { return this; }, setScrollFactor() { return this; }, setStrokeStyle() { return this; },
    setStroke() { return this; }, setScale(value) { this.scale = value; return this; }, setDisplaySize() { return this; }, setMask() { return this; },
    setInteractive() { return this; }, on(event, fn) { this[event]=fn;return this; }, createGeometryMask() { return {}; },
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
function fixture(world, visited = false, discoveries = []) {
  const s = new ctx.ExpertScene(); s.init({ world }); s.expert = experts[world]; s.cardIndex = 0; s.showingTip = false;
  let save = {coins: 43, discoveries, expertIntroductions: { [world]: visited }};
  s.registry = { get: () => save, set: (key,value) => { save=value; } }; s.getSaveData = () => save;
  s.add = { container: art, rectangle(x,y,w,h){return Object.assign(art(x,y),{width:w,height:h})}, ellipse: art, zone: art, image(x,y) { return Object.assign(art(x,y), {width:1586,height:992}); }, circle: art, text: art };
  s.shopConfig = s.getShopConfig(); s.addBackground();
  s.input = { keyboard: new EventEmitter() }; s.textures = { exists: () => true };
  s.scene = { start(key) { s.returnedTo=key; } }; s.dialog = new ctx.DialogManager(s);
  const controls = Object.create(ctx.PortableControls.prototype); controls.activeScene = () => s;
  s.showLoadingScreen(); return { s, controls };
}

for (const world of Object.keys(experts)) for (const visited of [false, true]) {
  test(`${world}, ${visited ? 'return' : 'first'} visit: the board waits for the complete welcome`, () => {
    const { s, controls } = fixture(world, visited);
    assert.equal(s.knowledgeBoard.visible, false); assert.equal(s.canBrowseKnowledge(), false);
    assert.ok(960 / s.studyBackdrop.scale < s.studyBackdrop.width / 2);
    const welcome = visited ? [experts[world].returnGreeting]
      : (experts[world].introduction || [experts[world].greeting, experts[world].returnGreeting]);
    s.input.keyboard.emit('keydown-RIGHT'); assert.equal(s.cardIndex, 0);
    for (const text of welcome) {
      assert.equal(s.dialog.text.text, text); assert.equal(s.knowledgeBoard.visible, false);
      controls.dispatch('confirm');
    }
    assert.equal(s.dialog.container.visible, false); assert.equal(s.knowledgeBoard.visible, true);
    assert.equal(s.studyBackdrop.scale, s.studyScale); assert.equal(s.studyBackdrop.x, 480);
    assert.equal(s.cardIndex, 0); assert.equal(s.canBrowseKnowledge(), true);
    assert.equal(s.getSaveData().expertIntroductions[world],true);
    assert.equal(s.getSaveData().coins,43);
    s.input.keyboard.emit('keydown-RIGHT'); assert.equal(s.cardIndex, 1);
  });
}

test('the first desert conversation is a complete introduction without the return greeting',()=>{
  const {s,controls}=fixture('desert');
  assert.equal(s.dialog.pages.length,4);
  assert.match(s.dialog.text.text,/Willkommen.*Professor Knobel.*Monster und Natur/);
  controls.dispatch('confirm'); assert.match(s.dialog.text.text,/grünen Drachen/);
  controls.dispatch('confirm'); assert.match(s.dialog.text.text,/gestern.*über der Ruine/);
  controls.dispatch('confirm'); assert.match(s.dialog.text.text,/Komm gerne wieder.*Tipps zu Gegnern/);
  assert.ok(s.dialog.pages.every(page=>page.text!==experts.desert.returnGreeting));
  controls.dispatch('confirm'); assert.equal(s.dialog.container.visible,false);
  const returning=fixture('desert',true); assert.equal(returning.s.dialog.pages.length,1);
  assert.match(returning.s.dialog.text.text,/Reisen gesehen.*Tipp/);
  assert.doesNotMatch(returning.s.dialog.text.text,/Drachen/);
});

test('the first desert conversation opens the ruin only after its dialog closes',()=>{
  const {s,controls}=fixture('desert');
  assert.equal(s.getSaveData().unlockedLevels?.includes('Wuestenruine') || false,false);
  for (let page=1;page<4;page++) {
    controls.dispatch('confirm');
    assert.equal(s.getSaveData().unlockedLevels?.includes('Wuestenruine') || false,false);
    assert.equal(s.getSaveData().expertIntroductions.desert,false);
  }
  controls.dispatch('confirm');
  assert.equal(s.getSaveData().unlockedLevels.includes('Wuestenruine'),true);
  assert.equal(s.getSaveData().expertIntroductions.desert,true);
});

test('only a known card opens a short tip, by Enter or by clicking its picture',()=>{
  const {s,controls}=fixture('desert',true,['mole-normal']); controls.dispatch('confirm');
  assert.equal(s.cardViews.length,experts.desert.cards.length);assert.equal(s.cardViews[0].known,true);assert.equal(s.cardViews[1].known,false);
  controls.dispatch('confirm'); assert.equal(s.showingTip,true);
  s.input.keyboard.emit('keydown-RIGHT'); assert.equal(s.cardIndex,0);
  controls.dispatch('confirm'); assert.equal(s.showingTip,true);assert.equal(s.tipIndex,1);
  controls.dispatch('confirm'); assert.equal(s.showingTip,true);assert.equal(s.tipIndex,1);
  s.closeKnowledgeTip(); assert.equal(s.showingTip,false);
  s.input.keyboard.emit('keydown-RIGHT'); controls.dispatch('confirm'); assert.equal(s.showingTip,false);
  const card=s.cardViews[0].view;card.list.at(-1).pointerdown();assert.equal(s.showingTip,true);
  assert.equal(s.closeKnowledgeTip(),true);assert.equal(s.closeKnowledgeTip(),false);
  s.chooseCard(-1);assert.equal(s.cardIndex,experts.desert.cards.length-1);
});

test('a new adventurer starts on a known equipment card instead of an entirely unknown page',()=>{
  const {s,controls}=fixture('desert',true,['sword']);controls.dispatch('confirm');
  assert.equal(s.expert.cards[s.cardIndex],'sword');assert.ok(s.cardViews.some(v=>v.selected&&v.known));
  controls.dispatch('confirm');assert.equal(s.showingTip,true);
});

test('Back first closes a tip, then returns to the map; the map button works too',()=>{
  const {s,controls}=fixture('desert',true,['mole-normal']); controls.dispatch('confirm');controls.dispatch('confirm');
  s.input.keyboard.on('keydown-ESC',()=>{if(!s.closeKnowledgeTip())s.scene.start(s.expert.map)});
  controls.dispatch('back');assert.equal(s.showingTip,false);assert.equal(s.returnedTo,undefined);
  controls.dispatch('back');assert.equal(s.returnedTo,'DessertMapScene');
  s.returnedTo=null;s.knowledgeBoard.list.at(-1).pointerdown();assert.equal(s.returnedTo,'DessertMapScene');
});

test('revisiting the professor never updates the destroyed map button from the previous visit',()=>{
  const {s}=fixture('jungle',true);const old=s.mapReturnButton;old.destroy();
  old.setText=()=>{throw new Error('the old text texture was destroyed')};
  assert.doesNotThrow(()=>s.createExpertBoard());assert.notEqual(s.mapReturnButton,old);
});

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

test('all world-appropriate cards are visible together, with no page or category navigation',()=>{
  for(const world of Object.keys(experts)){
    const {s,controls}=fixture(world,true);controls.dispatch('confirm');
    assert.equal(s.cardViews.length,experts[world].cards.length);assert.equal(s.categories,undefined);
    for(const card of s.cardViews){const r=card.view.list[0];assert.ok(r.x-r.width/2>=310&&r.x+r.width/2<=946);assert.ok(r.y-r.height/2>=170&&r.y+r.height/2<=539)}
    s.input.keyboard.emit('keydown-DOWN');assert.equal(s.cardIndex,experts[world].cards.length<=6?3:4);
    s.input.keyboard.emit('keydown-UP');assert.equal(s.cardIndex,0);
  }
});

test('picture cards give one short emphasized idea at a time, without damage or time statistics', () => {
  for (const [world,expert] of Object.entries(experts)) for (const id of expert.cards) {
    const card=ctx.getExpertCard(world,id);assert.ok(['enemy','equipment'].includes(card.kind));
    assert.ok(card.tips.length>=1);
    for(const text of card.tips){assert.ok(text.includes('**'));assert.equal(text.split('**').length%2,1);
      assert.ok(!/\d|Sekunden|Millisekunden|Prozent|Lebenspunkte/.test(text.replace(/\{[^}]*\}/g,'')),text);
      assert.ok(text.split(/\s+/).length<=27,text);
    }
  }
  assert.match(experts.jungle.greeting,/Urwald/);assert.match(experts.jungle.returnGreeting,/Urwald/);
  assert.ok(cards['monkey-brown'].tips[0].includes('**leichten Schaden**'));
  assert.ok(cards['monkey-brown'].tips[1].includes('**klebst du fest**'));
});

test('each discovery belongs to exactly one professor; common gear stays in the desert',()=>{
  const tips=ctx.getExpertCard('desert','companion').tips.join(' ');
  assert.match(tips,/sammelt nahe Beeren/);assert.match(tips,/bringt sie zu dir/);assert.match(tips,/Herzen/);
  assert.doesNotMatch(tips,/Urwald|Kokos|Lianen|Fledermäuse/);
  const all=Object.values(experts).flatMap(expert=>expert.cards);
  assert.equal(new Set(all).size,all.length);assert.deepEqual([...all].sort(),Object.keys(cards).sort());
  for(const world of ['underground','jungle'])for(const id of ['sword','shield','honey','shoes','companion'])assert.equal(ctx.getExpertCard(world,id),null);
  assert.match(ctx.getExpertCard('jungle','monkey-brown').tips.join(' '),/schlürft nahe Kokospfützen/);
});

test('reviewed tips cover actual equipment controls, digging and enemy counterplay',()=>{
  const tips=(world,id)=>ctx.getExpertCard(world,id).tips.join(' ');
  assert.match(tips('desert','shoes'),/Sprinten.*zweimal schnell/);assert.doesNotMatch(tips('desert','shoes'),/Schweben|Springen/);
  assert.match(tips('underground','powerHammer'),/Gelbe Blitze.*Rote Blitze.*blauen Blitzen/);assert.match(tips('underground','powerHammer'),/Druckwelle/);
  assert.match(tips('underground','powerHammer'),/Erde unter dir/);assert.match(tips('underground','powerHammer'),/Geduckt/);
  assert.equal(ctx.getExpertCard('jungle','powerHammer'),null);assert.equal(ctx.getExpertCard('underground','bow'),null);
  assert.match(tips('jungle','bow'),/Klettern/);
  assert.match(tips('underground','bat'),/sind giftig/);assert.match(tips('underground','bat'),/keine Pfütze/);
  for(const id of ['monkey-brown','monkey-red','monkey-blue']){assert.match(tips('jungle',id),/ausholt/);assert.match(tips('jungle',id),/Weiche|Bewege/)}
  assert.match(tips('jungle','monkey-king'),/prallen an den Rändern ab/);
  assert.match(tips('jungle','jungleShield'),/Steinmonster wirft er aber nicht zurück/);
});

for(const world of Object.keys(experts))test(world+': the complete collection awards a badge and modest gold only once',()=>{
  const save={coins:31,discoveries:experts[world].cards.slice(1),expertRewards:{}};
  assert.equal(ctx.claimExpertReward(save,world),save);
  const complete={...save,discoveries:[...experts[world].cards]},next=ctx.claimExpertReward(complete,world);
  assert.equal(next.coins,56);assert.equal(next.expertRewards[world],true);assert.equal(complete.coins,31);
  assert.equal(ctx.claimExpertReward(next,world),next);
});

test('mixed-weight text uses whole-run measurements without accumulating rounding gaps', () => {
  const measure = text => Math.ceil(text.length * 3.3);
  const { runs } = ctx.layoutEmphasizedText('Viele kleine Worte vor **einem Hinweis** und danach.', 330, measure);
  assert.equal(runs[1].x, measure(runs[0].text) + measure(' '));
  assert.equal(runs[2].x, runs[1].x + measure(runs[1].text) + measure(' '));
});

test('keyboard and touch instructions are resolved before bold text is measured',()=>{
  for(const profile of ['pc','ipadKeyboard','ipadTouch']){
    const {s,controls}=fixture('desert',true,['honey']);
    s.registry.get().settings={controlProfile:profile};controls.dispatch('confirm');controls.dispatch('confirm');controls.dispatch('confirm');
    assert.equal(s.tipIndex,1);
    const paragraph=s.board.list.find(child=>child.list?.some(run=>/Pack|Trinken/.test(run.text)));
    const text=paragraph.list.map(run=>run.text).join(' ');assert.doesNotMatch(text,/\{|\}/);
    if(profile==='ipadTouch'){assert.match(text,/Trank 1/);assert.match(text,/Trank 2/);assert.doesNotMatch(text,/\bT\b|\bG\b/)}
    else{assert.match(text,/\bT\b/);assert.match(text,/\bG\b/)}
  }
});
