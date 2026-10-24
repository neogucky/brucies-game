const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function savedGame(data) {
  let stored = JSON.stringify(data);
  const context = {
    localStorage: {
      getItem: () => stored,
      setItem: (_, value) => { stored = value; },
      removeItem: () => { stored = null; },
    },
    normalizeInventory: value => ({ inventory: value.inventory, equipped: value.equipped }),
  };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, '../src/saveManager.js'), 'utf8')
    .replace(/^import .*;\n/gm, '').replace(/export /g, '');
  vm.runInContext(source + '\nglobalThis.api = { loadSave, saveProgress };', context);
  return context.api;
}

for (const health of [0, -1, null, '0']) {
  test(`loading a defeated or invalid save restores full health (${JSON.stringify(health)})`, () => {
    const save = savedGame({ health, coins: 123, currentLevel: 'Schluesselweg' }).loadSave();
    assert.equal(save.health, 5);
    assert.equal(save.coins, 123);
    assert.equal(save.currentLevel, 'Schluesselweg');
  });
}

test('loading a living save keeps its remaining hearts and inventory', () => {
  const save = savedGame({ health: 2, inventory: { consumables: { honey: 3 } } }).loadSave();
  assert.equal(save.health, 2);
  assert.equal(save.inventory.consumables.honey, 3);
});
