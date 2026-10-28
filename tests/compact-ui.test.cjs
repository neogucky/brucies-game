const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ctx = vm.createContext({ Phaser: { Scene: class {} }, saveProgress() {} });
function load(file, name) {
  let code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/^import .*;\n/gm, '');
  if (name) code = code.replace(/export default class \w+/, `globalThis.${name} = class ${name}`);
  vm.runInContext(code.replace(/export /g, ''), ctx);
}
load('src/utils/controlProfiles.js'); load('src/utils/PortableControls.js', 'PortableControls');
load('src/utils/weapons.js'); load('src/ui/topHud.js', 'TopHud'); load('src/scenes/MainMenuScene.js', 'MainMenuScene');
const plain = value => JSON.parse(JSON.stringify(value));
const scene = (key, extra = {}) => ({ sys: { settings: { key } }, ...extra });

test('the main action bar stays contextual: two actions on maps, three in play, and none duplicated beside modals', () => {
  const map = scene('JungleMapScene', { currentNode: {}, toggleInventory() {} });
  const play = scene('JungleScene', { player: {}, toggleInventory() {} });
  assert.deepEqual(plain(ctx.controlBarActions(map)), ['inventory', 'back']);
  assert.deepEqual(plain(ctx.controlBarActions(play)), ['inventory', 'pause', 'back']);
  for (const modal of [{confirmation:{isOpen:true}}, {inventoryOverlay:{isOpen:true}}, {settingsBox:{visible:true}}, {isInteractingWithLever:true}]) {
    assert.equal(ctx.controlBarActions({...play,...modal}).length, 0);
  }
  assert.equal(ctx.controlBarActions(scene('MainMenuScene')).length, 0);
  assert.equal(ctx.controlBarActions(scene('CinemaScene')).length, 0);
  assert.equal(ctx.controlBarActions(scene('IntroScene',{isIntro:true})).length, 0);
  assert.equal(ctx.controlBarActions(play,true).length,0);
  assert.deepEqual(plain(ctx.controlBarActions({...play,dialog:{container:{visible:true}}})),['back']);
});

test('victory and defeat retain their usable continue/return actions', () => {
  assert.deepEqual(plain(ctx.controlBarActions(scene('JungleScene',{levelCompleted:true}))),['confirm']);
  assert.deepEqual(plain(ctx.controlBarActions(scene('JungleScene',{isGameOver:true}))),['confirm','back']);
});

test('map hints describe tapping in touch mode and the active confirmation key with a keyboard', () => {
  assert.ok(ctx.mapControlHint('ipadTouch').includes('antippen'));
  assert.ok(!ctx.mapControlHint('ipadTouch').includes('Richtungsknöpfe'));
  assert.ok(ctx.mapControlHint('ipadKeyboard').endsWith('Betreten · Enter'));
  assert.ok(ctx.mapControlHint('pc').endsWith('Betreten · Enter'));
});

function settingsFixture(profile) {
  let save = { coins: 418, settings: { controlProfile: profile, autoAim: true } }, changes = [];
  const s = new ctx.MainMenuScene();
  s.registry = { get: () => save, set(_key, value) { save = value; } };
  s.game = { portableControls: { setProfile(value) { changes.push(value); } } };
  s.settingsBox = { setVisible(value) { this.visible = value; } };
  s.updateSettingsText = () => {};
  return { s, saved: () => save, changes };
}
test('the settings dialog edits a draft and saves the selected profile without losing other progress', () => {
  const {s,saved,changes} = settingsFixture('ipadKeyboard');s.openSettingsDialog();
  s.settingsActions.down();s.settingsActions.right();
  assert.equal(s.pendingSettings.controlProfile,'pc');assert.equal(saved().settings.controlProfile,'ipadKeyboard');
  s.settingsActions.down();s.settingsActions.confirm();
  assert.equal(saved().settings.controlProfile,'pc');assert.equal(saved().settings.autoAim,true);assert.equal(saved().coins,418);
  assert.deepEqual(changes,['pc']);assert.equal(s.settingsBox.visible,false);assert.equal(s.isDialogOpen,false);
});
test('cancelling settings keeps the old input profile, while invalid profiles default to the iPad keyboard', () => {
  for(const profile of ['pc','unknown']) {
    const {s,saved,changes}=settingsFixture(profile);s.openSettingsDialog();
    assert.equal(s.pendingSettings.controlProfile,profile==='pc'?'pc':'ipadKeyboard');
    s.settingsActions.down();s.settingsActions.left();s.settingsActions.back();
    assert.equal(saved().settings.controlProfile,profile);assert.equal(changes.length,0);assert.equal(s.pendingSettings,null);
  }
});

function art(x=0,y=0,width=150,height=150) {
  return {x,y,width,height,visible:true,alpha:1,text:'',
    setVisible(v){this.visible=v;return this},setPosition(x,y){this.x=x;this.y=y;return this},
    setTexture(v){this.texture=v;return this},setDisplaySize(w,h){this.displayWidth=w;this.displayHeight=h;return this},
    setText(v){this.text=v;return this},setAlpha(v){this.alpha=v;return this},
    setScale(){return this},setOrigin(){return this},setStroke(){return this},setStrokeStyle(){return this},setDepth(){return this},setColor(){return this}};
}
function hudFixture(overview=false) {
  const equipped={weapon:'powerHammer',secondary:'bow',shield:'jungleShield',shoes:'shoes',companion:'default',consumable:'honey',consumable2:'honey'};
  const inventory={consumables:{honey:3}};
  const s={equipped,inventory,add:{image:art,rectangle:art,text(x,y,text){return Object.assign(art(x,y),{text})}},textures:{exists:()=>true}};
  const hud=new ctx.TopHud(s,{activeEquipped:'powerHammer',showCompanion:true,activeDisabled:overview,consumables:inventory.consumables});
  hud.syncEquipment(equipped,inventory);
  return {hud,equipped,inventory};
}
const shown = hud => Object.keys(hud.items).filter(key=>hud.items[key].frame.visible);
test('maps and shops hide equipment clutter even when the hero owns every item', () => {
  const {hud,equipped,inventory}=hudFixture(true);assert.deepEqual(shown(hud),[]);
  hud.setActiveEquipped('sword');hud.setCompanionStatus({health:1,respawnRatio:0});hud.syncEquipment(equipped,inventory);
  assert.deepEqual(shown(hud),[]);assert.equal(hud.items.companion.heart.visible,false);
});
test('the compact combat bar hides empty slots and passive shoes; the inventory remains unchanged', () => {
  const {hud,equipped,inventory}=hudFixture();assert.equal(shown(hud).length,6);assert.equal(hud.items.shoes.frame.visible,false);
  const x=hud.items.active.frame.x;for(let i=0;i<20;i++)hud.syncEquipment(equipped,inventory);assert.equal(hud.items.active.frame.x,x);
  inventory.consumables.honey=0;equipped.secondary=null;equipped.companion=null;hud.syncEquipment(equipped,inventory);
  assert.deepEqual(shown(hud),['active','shield']);assert.equal(equipped.shoes,'shoes');assert.equal(equipped.consumable,'honey');
});
test('compact layout preserves shield and companion recharge status when equipment does not change', () => {
  const {hud,equipped,inventory}=hudFixture();
  hud.setShieldCooldown({owned:true,active:false,ratio:.5});hud.setCompanionStatus({health:0,respawnRatio:.5});
  hud.syncEquipment(equipped,inventory);
  assert.equal(hud.items.shield.barBg.visible,true);assert.equal(hud.items.shield.icon.alpha,.4);
  assert.equal(hud.items.companion.barBg.visible,true);assert.equal(hud.items.companion.heart.visible,false);
  hud.setShieldCooldown({owned:true,active:true,ratio:0});hud.setCompanionStatus({health:1,respawnRatio:0});hud.syncEquipment(equipped,inventory);
  assert.equal(hud.items.shield.barBg.visible,false);assert.equal(hud.items.companion.barBg.visible,false);assert.equal(hud.items.companion.heart.visible,true);
});

test('explicit empty equipment slots do not reappear through legacy equipment values', () => {
  for (const passive of ['bow','shield']) {
    const slots=ctx.visibleHudSlots({weapon:'sword',secondary:null,shield:null,passive},{consumables:{honey:0}});
    assert.deepEqual(plain(slots),['active']);
  }
});
