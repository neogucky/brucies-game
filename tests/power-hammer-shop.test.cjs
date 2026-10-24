const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const context = { Phaser: { Scene: class {} }, saveProgress: data => { context.saved = data; } };
vm.createContext(context);
function load(file, className) {
  let source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8').replace(/^import .*;\n/gm, '');
  source = className ? source.replace(`export default class ${className}`, `globalThis.${className} = class ${className}`) : source.replace(/export /g, '');
  vm.runInContext(source, context);
}
load('utils/weapons.js'); load('utils/inventory.js'); load('utils/itemRegistry.js');
load('scenes/shop/ShopSceneBase.js', 'ShopSceneBase');
load('scenes/underground/UndergroundShopScene.js', 'UndergroundShopScene');
load('ui/InventoryOverlay.js', 'InventoryOverlay'); load('ui/topHud.js', 'TopHud');

function shop(coins) {
  const scene = new context.UndergroundShopScene();
  let save = { coins, health: 5 };
  Object.assign(scene, context.normalizeInventory(save));
  scene.registry = { get: () => save, set: (_, next) => { save = next; } };
  scene.shopConfig = scene.getShopConfig();
  scene.coins = coins; scene.health = 5; scene.honeyCount = 0;
  scene.updateHudAfterPurchase = () => {};
  scene.dialog = { show(data) { this.data = data; } };
  return scene;
}

test('hammer costs 200 gold, is saved as an owned weapon, and cannot be bought twice', () => {
  const scene = shop(250);
  const hammer = scene.shopConfig.items.find(item => item.id === 'powerHammer');
  assert.equal(hammer.price, 200);
  scene.buyItem(hammer);
  assert.equal(scene.coins, 50);
  assert.equal(scene.inventory.weapons.powerHammer, true);
  assert.equal(scene.inventory.weapons.sword, true);
  assert.equal(scene.canShowItem(hammer), false);
  scene.buyItem(hammer);
  assert.equal(scene.coins, 50);
  const restored = context.normalizeInventory(context.saved);
  assert.equal(restored.inventory.weapons.powerHammer, true);
  assert.equal(restored.equipped.weapon, 'sword');
});

test('insufficient gold or an unfinished shop loading screen cannot grant the hammer', () => {
  const poor = shop(199);
  const hammer = poor.shopConfig.items.find(item => item.id === 'powerHammer');
  poor.buyItem(hammer);
  assert.equal(poor.coins, 199);
  assert.equal(poor.inventory.weapons.powerHammer, undefined);
  const loading = shop(200); loading.isLoading = true; loading.buyItem(hammer);
  assert.equal(loading.inventory.weapons.powerHammer, undefined);
  assert.equal(loading.coins, 200);
});

test('hammer inventory choice appears only after purchase and shares the primary weapon slot', () => {
  const scene = shop(200);
  const overlay = new context.InventoryOverlay(scene);
  overlay.inventory = scene.inventory; overlay.equipped = scene.equipped;
  assert.equal(overlay.createColumns()[0].options.some(item => item.id === 'powerHammer'), false);
  scene.buyItem(scene.shopConfig.items.find(item => item.id === 'powerHammer'));
  const weapons = overlay.createColumns()[0];
  assert.equal(weapons.key, 'weapon');
  assert.equal(weapons.options.some(item => item.id === 'sword'), true);
  assert.equal(weapons.options.some(item => item.id === 'powerHammer'), true);
  scene.equipped.weapon = 'powerHammer'; scene.saveInventory();
  assert.equal(context.normalizeInventory(context.saved).equipped.weapon, 'powerHammer');
  assert.equal(context.normalizeInventory({ equipped: { weapon: 'powerHammer' } }).equipped.weapon, 'sword');
});

test('HUD displays the equipped hammer icon and can switch back to the sword or empty slot', () => {
  const icon = { setTexture(value) { this.texture = value; }, setVisible(value) { this.visible = value; } };
  const hud = { items: { active: { icon } }, updateHintForKey() {} };
  context.TopHud.prototype.setActiveEquipped.call(hud, 'powerHammer');
  assert.equal(icon.texture, 'item-power-hammer'); assert.equal(icon.visible, true);
  context.TopHud.prototype.setActiveEquipped.call(hud, 'sword'); assert.equal(icon.texture, 'item-sword');
  context.TopHud.prototype.setActiveEquipped.call(hud, null); assert.equal(icon.visible, false);
});

test('male and female knight textures change when equipping the hammer and revert for the sword', () => {
  for (const gender of ['male', 'female']) {
    const player = { data: {}, setData(key, value) { this.data[key] = value; }, setTexture(value) { this.texture = value; } };
    const scene = { player, equipped: { weapon: 'powerHammer' }, registry: { get: () => ({ playerGender: gender }) } };
    context.applyWeaponAppearance(scene);
    assert.equal(player.texture, gender === 'female' ? 'knight-female-hammer-standing' : 'knight-hammer-standing');
    assert.match(player.data.crouchHitTexture, /hammer-crouching-hitting$/);
    scene.equipped.weapon = 'sword'; context.applyWeaponAppearance(scene);
    assert.equal(player.texture, gender === 'female' ? 'knight-female-standing' : 'knight-standing');
  }
});
