const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const repair = vm.runInNewContext(read('src/utils/ruinRepair.js').replace(/export /g, '') + '\n({ruinRepairState,feetOnRepairPad,RUIN_REPAIR_PAD});');

test('repair accepts the first coin, partial amounts and the last few coins without requiring a multiple of ten', () => {
  assert.equal(repair.ruinRepairState(0).ready, false);
  assert.equal(repair.ruinRepairState(1).amount, 1);
  assert.equal(repair.ruinRepairState(9).amount, 9);
  assert.equal(repair.ruinRepairState(100, 97).amount, 3);
  assert.equal(repair.ruinRepairState(100, 100).amount, 0);
  assert.equal(repair.ruinRepairState(100, 0, true).complete, true);
});

test('the repair trigger follows the visible oval under the feet, independently of the sprite or weapon size', () => {
  const body = (x, y) => ({ center: { x }, bottom: y });
  const pad = repair.RUIN_REPAIR_PAD;
  assert.equal(repair.feetOnRepairPad(body(pad.x, pad.y)), true);
  assert.equal(repair.feetOnRepairPad(body(pad.x + 70, pad.y)), true);
  assert.equal(repair.feetOnRepairPad(body(pad.x + 80, pad.y + 25)), false);
  assert.equal(repair.feetOnRepairPad(body(pad.x, pad.y + 35)), false);
  assert.equal(repair.feetOnRepairPad(null), false);
});

test('saved repair progress restores the matching construction stage, including completed and invalid saves', () => {
  for (const [paid, texture] of [[0, 'desert-ruin-v2'], [33, 'desert-ruin-v2'],
    [34, 'desert-ruin-foundation-v3'], [66, 'desert-ruin-foundation-v3'],
    [67, 'desert-ruin-walls-v3'], [99, 'desert-ruin-walls-v3'], [100, 'desert-ruin-repaired-v2']]) {
    assert.equal(repair.ruinRepairState(0, paid).texture, texture);
  }
  assert.equal(repair.ruinRepairState(0, 0, true).texture, 'desert-ruin-repaired-v2');
  assert.equal(repair.ruinRepairState(0, 900).texture, 'desert-ruin-repaired-v2');
  assert.equal(repair.ruinRepairState(0, -10).texture, 'desert-ruin-v2');
  assert.equal(repair.ruinRepairState(0, 'broken-save').texture, 'desert-ruin-v2');
});

test('the last payment is saved before the completion animation and cannot be charged twice', () => {
  let save = { coins: 12, health: 4, ruinRepairCoins: 97, inventory: { consumables: {} } }, completed = 0;
  const ctx = vm.createContext({ ...repair, Phaser: { Scene: class {} },
    applyInventoryToSave: save => save, saveProgress() {} });
  vm.runInContext(read('src/scenes/desert/DesertRuinScene.js').replace(/^import .*;\n/gm, '')
    .replace('export default class DesertRuinScene', 'globalThis.Ruin = class DesertRuinScene'), ctx);
  const s = new ctx.Ruin(), sprite = new Proxy({}, { get: () => () => sprite });
  Object.assign(s, { coinsCollected: 12, ruinStoredCoins: 97, inventory: { consumables: {} }, equipped: {}, health: 4,
    player: { x: 480, body: { bottom: 338 } }, time: { now: 1000 }, add: { image: () => sprite }, tweens: { add() {} },
    registry: { get: () => save, set: (_key, next) => { save = next; } }, updateRepairGuide() {},
    completeRuinRepair() { assert.equal(save.coins, 9); assert.equal(save.ruinRepairCoins, 100); this.ruinRepaired = true; completed++; } });
  s.tryDepositRuinCoins(); assert.equal(completed, 1); assert.equal(save.health, 4);
  s.time.now = 2000; s.tryDepositRuinCoins(); assert.equal(save.coins, 9); assert.equal(completed, 1);
  const reloaded = JSON.parse(JSON.stringify(save));
  assert.equal(repair.ruinRepairState(reloaded.coins, reloaded.ruinRepairCoins).complete, true);
});
